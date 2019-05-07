var apiKey, sessionId, token;
var session, publisher, subscriber;
var connectionCount = 0;
var video = true;
var username, roomName;

// Handling all of our errors here by alerting them
function handleError(error) {
  if (error) {
    console.log(error.message);
  }
}











/* ====================== START OF TOKBOX API ====================== */

function join() {
  var SERVER_BASE_URL = 'https://tokbox-test-server-node.herokuapp.com';
  roomName = getRoomName();
  username = getUsername();

  if (roomName && username) {
    document.getElementById("loader").classList.add("active");

    SERVER_BASE_URL += "/room/" + roomName + "/";
    SERVER_BASE_URL += username;

    console.log(SERVER_BASE_URL);

    fetch(SERVER_BASE_URL).then(function (res) {
      return res.json()
    }).then(function (res) {
      apiKey = res.apiKey;
      sessionId = res.sessionId;
      token = res.token;
      connect();
    }).catch(handleError);
  }
}

// create a publisher (yourself)
function publish() {
  var publisherProperties = {
    insertMode: 'append',
    width: '100%',
    height: '130px',
    videoSource: video,
    name: getUsername()
  };
  publisher = OT.initPublisher('publisher', publisherProperties);
  publisher.on({
    streamCreated: function (event) {
      console.log("Publisher started streaming.");
      publishedSettings();
    },
    streamDestroyed: function (event) {
      console.log("Publisher stopped streaming. Reason: " +
        event.reason);
      unpublishedSettings()
    }
  });
}

// create a stream to connect myself to others
function connect() {
  session = OT.initSession(apiKey, sessionId);

  session.on({
    connectionCreated: function (event) {
      connectionCount++;
      console.log(connectionCount + ' connections.');
      addUser(event.connection.data, event.connection.connectionId, session.connection.connectionId);
    },
    connectionDestroyed: function (event) {
      connectionCount--;
      console.log(connectionCount + ' connections.');
      removeUser(event.connection.data, event.connection.connectionId);
    },
    sessionDisconnected: function sessionDisconnectHandler(event) {
      // The event is defined by the SessionDisconnectEvent class
      console.log('Disconnected from the session.');
      toggleButtons();
      resetOnlineUsers();
      disconnected();
      connectionCount = 0;
      if (event.reason == 'networkDisconnected') {
        alert('Your network connection terminated.')
      }

      // remove previous handlers/listeners attached to session
      session.off();
    },
    streamCreated: function (event) {
      var targetElement = subscribeVideo(event.stream.hasVideo);
      subscriber = session.subscribe(event.stream, targetElement, {
        insertMode: 'append',
        width: '50%',
        height: '130px'
      }, handleError);

      userTalking(event.stream.connection.connectionId);
    },
    streamDestroyed: function(event) {
      userStoppedTalking(event.stream.connection.connectionId);
    }
  });

  session.connect(token, function (error) {
    if (error) {
      console.log('Unable to connect: ', error.message);
    } else {
      toggleButtons();
      connected();
      console.log('Connected to the session.');
    }
  });
}

function disconnect() {
  session.disconnect();
}

/* ====================== END OF TOKBOX API ====================== */













/* ====================== START OF APP METHODS ====================== */

// adding yourself or other users available in the chat room
function addUser(username, connectionId, sessionId) {
  updateUserCount();

  // remove property name
  var name = username.replace('username=', '');

  var nameElement = document.createElement('p');
  nameElement.id = connectionId;
  nameElement.classList = "chip";
  nameElement.innerHTML = name;


  var soundElement = document.createElement('button');
  soundElement.id = connectionId + "-sound";
  soundElement.classList = "btn-floating waves-effect waves-light grey material-icons";
  // soundElement.innerHTML = "volume_up";

  // connection detected is yourself
  if (sessionId == connectionId)
    nameElement.innerHTML += " (You)";
  else
    M.toast({
      html: name + " joined the channel"
    });

  nameElement.prepend(soundElement);
  document.getElementById("onlineUsers").appendChild(nameElement);
}

// users left the room
function removeUser(username, connectionId) {
  var name = username.replace('username=', '');
  M.toast({
    html: name + " left the channel"
  });

  updateUserCount();
  document.getElementById(connectionId).remove();
}

// leaving current chat room
function resetOnlineUsers() {
  updateUserCount();
  var node = document.getElementById("onlineUsers");
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function updateUserCount() {
  document.getElementById("user_count").innerHTML = connectionCount;
}

// turn on walkie talkie
function pushTalk() {
  publish();
  session.publish(publisher);
  document.getElementById("pushBtn").classList.add("pulse-slow-animation");
}

// turn off walkie talkie
function stopTalk() {
  if (publisher)
    session.unpublish(publisher);

  document.getElementById("pushBtn").classList.remove("pulse-slow-animation");
}

function userTalking(sessionId) {
  document.getElementById(sessionId + "-sound").innerHTML = "volume_up";
}

function userStoppedTalking(sessionId) {
  document.getElementById(sessionId + "-sound").innerHTML = "";
}

function subscribeVideo(hasVideo) {
  if (hasVideo)
    return "subscriber";
  else  
    return "subscriberHidden";
}

/* ====================== END OF APP METHODS ====================== */











/* ====================== START OF UI CUSTOMISATION ====================== */

function getRoomName() {
  return document.getElementById('roomName').value;
}

function getUsername() {
  return document.getElementById('username').value;
}

// UI settings for when user is connected to a channel
function connected() {
  document.getElementById("username").disabled = true;
  document.getElementById("roomName").disabled = true;
  document.getElementById("joinBtn").classList.add("hide");
  document.getElementById("loader").classList.remove("active");
  document.getElementById("chat-details").classList.add("scale-in");
  document.getElementById('disconnectBtn').classList.remove("hide");
  document.getElementById('channel_name').innerHTML = roomName;
}

// UI settings for when a user leaves / is not connected to a channel
function disconnected() {
  document.getElementById("username").disabled = false;
  document.getElementById("roomName").disabled = false;
  document.getElementById("joinBtn").classList.remove("hide");
  document.getElementById('disconnectBtn').classList.add("hide");
  document.getElementById("chat-details").classList.remove("scale-in");
}

// UI button's state (connected / disconnected)
function toggleButtons() {
  document.getElementById('disconnectBtn').classList.toggle("disabled");
  document.getElementById('pushBtn').classList.toggle("disabled");
  document.getElementById("joinBtn").classList.toggle("disabled");
}

// when mic button is hold onto
function publishedSettings() {
  document.getElementById("pushBtn").classList.remove("pulse-slow-animation", "red");
  document.getElementById("pushBtn").classList.add("green");
}

// when mic button is released
function unpublishedSettings() {
  document.getElementById("pushBtn").classList.add("red");
  document.getElementById("pushBtn").classList.remove("green");
}

function hideCamera() {
  video = null;
  document.getElementById("publisher").classList.add("hide");
  document.getElementById("camera_value").innerHTML = "Camera OFF";
}

function showCamera() {
  video = true;
  document.getElementById("publisher").classList.remove("hide");
  document.getElementById("camera_value").innerHTML = "Camera ON";
}

function toggleCamera(element) {
  if (element.checked) {
    showCamera();
  } else {
    hideCamera();
  }
}

/* ====================== END OF UI CUSTOMISATION ====================== */
