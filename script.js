// Function to fetch user ID from GraphQL endpoint
async function findUserId(jwtToken) {
    const query = `
      query{
        user {
          id
          login
        }
      }
    `;
  
    const response = await fetch('https://01.kood.tech/api/graphql-engine/v1/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({query}),
      });
    
      if (!response.ok) {
        throw new Error('Failed to fetch transaction data.');
      }
      const data = await response.json();
    return data.data.user[0];
  }
  
  // Function to fetch transaction amount from GraphQL endpoint
  async function findDoneTasks(jwtToken, userId) {
    const query = `
      query {
        transaction(where: {
          userId: { _eq: ${userId}}
          type: { _eq: "xp" }
          path: {_nregex: "piscine-go|piscine-js-2-old/|rust/"}
          eventId: { _gt: 0 }
        }) {
          amount
          path
          createdAt
        }
      }
    `;

    const response = await fetch('https://01.kood.tech/api/graphql-engine/v1/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({query}),
    });
  
    if (!response.ok) {
      throw new Error('Failed to fetch transaction data.');
    }
    const data = await response.json();
    return data;
  }


// Function to fetch user data from GraphQL endpoint
async function getUserData(jwtToken, year) {
  const userId = await findUserId(jwtToken);
    const tasks = await findDoneTasks(jwtToken, userId.id);

    const graph = createInitialXpGraph();
    const xpData = [];
    const accumulatedPoints = [];

    for (const doneTasks of tasks.data.transaction) {

        // Add the newDataPoint to the xpData array
          if (year === 2021 || year === 2022 || year === 2023){
            var spiltDate = doneTasks.createdAt.toString().split('-');
            if (spiltDate[0] === year.toString()){
              xpData.push(doneTasks);
              // Calculate accumulated points for each data point
              let accumulatedPoint = xpData.reduce((sum, dataPoint) => sum + dataPoint.amount, 0);
              accumulatedPoints.push(accumulatedPoint)
            }
          }
          else{
            xpData.push(doneTasks);
            // Calculate accumulated points for each data point
            let accumulatedPoint = xpData.reduce((sum, dataPoint) => sum + dataPoint.amount, 0);
            accumulatedPoints.push(accumulatedPoint)
          }
    }

    xpData.sort(function(a,b){
      // Turn your strings into dates, and then subtract them
      // to get a value that is either negative, positive, or zero.
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
    console.log(xpData)

    // Update the scales and redraw the graph
    graph.xScale.domain(d3.extent(xpData, (d) => new Date(d.createdAt)));
    graph.yScale.domain([0, d3.max(accumulatedPoints)]);

    // Update the XP line on the graph
    graph.xpLine
        .datum(xpData)
        .attr('d', d3.line().x((d, i) => graph.xScale(new Date(d.createdAt))).y((d, i) => graph.yScale(accumulatedPoints[i])));

    // Update the XP data points on the graph
    const xpDots = graph.xpDots
        .selectAll('.dot')
        .data(xpData, (d) => d.createdAt) // Use createdAt as the data key function
        .join((enter) => enter.append('g').attr('class', 'dot'));

    xpDots
        .attr('transform', (d, i) => `translate(${graph.xScale(new Date(d.createdAt))},${graph.yScale(accumulatedPoints[i])})`);

    xpDots
        .append('circle')
        .attr('r', 5)
        .attr('fill', 'blue');

    // Add name (label) for each data point
    xpDots.selectAll('.dot-label')
        .data((d) => [d]) // Use array to have single data point for each label
        .join((enter) => enter.append('text').attr('class', 'dot-label'))
        .attr('x', -50) // Adjust the x position of the label relative to the data point
        .attr('y', -10) // Adjust the y position of the label relative to the data point
        .text((d) => d.path.substring(d.path.indexOf('/johvi/div-01/') + 14)); // Display the name property for each data point
        
    // Call the x-axis and y-axis functions to update the axes
    graph.xAxisGroup.call(graph.xAxis);
    graph.yAxisGroup.call(graph.yAxis);

    const userData = {
        id: userId.id,
        login: userId.login,
        point: accumulatedPoints.length > 0 ? accumulatedPoints[accumulatedPoints.length - 1] : 0,
    };

    return userData;
}
  
  // Function to display user information on the profile page
  function displayUserProfile(userData) {
    document.getElementById('ID').textContent = userData.id;
    document.getElementById('username').textContent = userData.login;
    document.getElementById('XP').textContent = userData.point;
  }
  
  // Function to handle logout
  function handleLogout() {
    // Clear the JWT token from localStorage or cookie
    localStorage.removeItem('jwtToken');
    // Redirect to the login page
    window.location.href = 'index.html';
  }
  
  // Function to handle user login
  async function handleLogin(event) {
    event.preventDefault();
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = '';
  
    const username = event.target.username.value;
    const password = event.target.password.value;
  
    try {
      const token = await loginUser(username, password);
      // Save the token in localStorage or a cookie for subsequent API requests
      localStorage.setItem('jwtToken', token);
      // Redirect to the user profile page
      window.location.href = 'profile.html';
    } catch (error) {
      errorMessage.textContent = 'Invalid credentials. Please try again.';
    }
  }
  
  // Function to log in the user and get JWT token
  async function loginUser(username, password) {
    const credentials = `${username}:${password}`;
    const encodedCredentials = btoa(credentials);
    const response = await fetch('https://01.kood.tech/api/auth/signin', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedCredentials}`,
      },
    });
  
    if (!response.ok) {
      throw new Error('Login failed');
    }
  
    const data = await response.json();
    return data;
  }
  
  // Check if the user is already logged in
  const jwtToken = localStorage.getItem('jwtToken');
  
  if (jwtToken) {
    // User is already logged in, fetch user data and display on the profile page
    getUserData(jwtToken, "none")
      .then((userData) => {
        displayUserProfile(userData);
      })
      .catch((error) => {
        console.error('Error fetching user data:', error);
        // Handle error if necessary (e.g., redirect to login page)
      });
  
    // Add event listener for logout button
    if (document.getElementById('logout-btn')){
        const logoutButton = document.getElementById('logout-btn');
        logoutButton.addEventListener('click', handleLogout);
    }
  } else {
    // User is not logged in, add event listener for login form submission
    if (document.getElementById('login-form')){
        const loginForm = document.getElementById('login-form');
        loginForm.addEventListener('submit', handleLogin);
    }
  }

  function createInitialXpGraph() {
    // Create an SVG element for the graph
    const newSvg = d3.select('#chart-container').append('svg').attr('id', 'xp-graph').attr('width', 800).attr('height', 400);

    // Define the margins and dimensions of the graph
    const margin = { top: 20, right: 30, bottom: 30, left: 50 };
    const width = +newSvg.attr('width') - margin.left - margin.right;
    const height = +newSvg.attr('height') - margin.top - margin.bottom;

    // Create scales for the x and y axes
    const xScale = d3.scaleTime().range([0, width]);
    const yScale = d3.scaleLinear().range([height, 0]);

    // Create the XP line
    const xpLine = newSvg
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
        .append('path')
        .attr('class', 'line')
        .attr('fill', 'none')
        .attr('stroke', 'blue');

    // Create the XP data points
    const xpDots = newSvg
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
        .attr('class', 'dots');

    // Create the x-axis
    const xAxis = d3.axisBottom(xScale);
    const xAxisGroup = newSvg
        .append('g')
        .attr('transform', `translate(${margin.left}, ${height + margin.top})`)
        .attr('class', 'x-axis');

    // Create the y-axis
    const yAxis = d3.axisLeft(yScale);
    const yAxisGroup = newSvg
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
        .attr('class', 'y-axis');

    return {
        xScale,
        yScale,
        xpLine,
        xpDots,
        xAxisGroup,
        yAxisGroup,
        xAxis,
        yAxis,
    };
  }

  function deleteCurrentSVG(){
    // Select the current SVG and remove it from the DOM
    d3.select('#xp-graph').remove();
  }

  function searchByYear(year) {

  deleteCurrentSVG();
  // Get the user data and display on the profile page using the new graph
  getUserData(jwtToken,year)
    .then((userData) => {
      displayUserProfile(userData);
    })
    .catch((error) => {
      console.error('Error fetching user data:', error);
      // Handle error if necessary (e.g., redirect to login page)
    });

  }