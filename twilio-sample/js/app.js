var token;
var connectionCount = 0;
var video = true;
var username, roomName;
var Video, currentRoom;
var tracks = [];

require(['js/twilio-video'], function (obj) {
  console.log("twilio is loaded");
  Video = obj;
});

// Handling all of our errors here by alerting them
function handleError(error) {
  if (error) {
    console.log(error.message);
  }
}








/* ====================== START OF TWILIO API ====================== */

function join() {
  var SERVER_BASE_URL = 'https://tokbox-test-server-node.herokuapp.com/twilio';

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
      token = res.token;
      connect();
    }).catch(handleError);
  }
}

// create a track (yourself)
function publish() {
  tracks = [];

  if (video) {
    // video (and audio) track
    var element = document.createElement('video');

    Video.createLocalTracks().then(function (localTracks) {
      localTracks.forEach(function (localTrack) {
        localTrack.attach(element);
        currentRoom.localParticipant.publishTrack(localTrack);

        tracks.push(localTrack);
      })
    });

    document.getElementById("publisher").appendChild(element);
  } else {
    // audio track
    Video.createLocalAudioTrack().then(function (localTrack) {
      tracks.push(localTrack);
      currentRoom.localParticipant.publishTrack(localTrack);
      publishedSettings();
    });
  }
}

function subscribeTrack(participant) {
  var element = document.createElement('video');
  element.id = participant.sid;
  element.classList.add("hide");

  // for existing tracks that are already publishing
  participant.tracks.forEach(track => {
    track.attach('#' + participant.sid);
  });

  // for future tracks that are not added yet (unpublished)
  participant.on('trackAdded', track => {
    track.attach('#' + participant.sid);
  });

  document.getElementById('participantTrack').appendChild(element);
}

// create a stream to connect myself to others
function connect() {
  Video.connect(token, {
    name: roomName,
    audio: false,
    video: false
  }).then(room => {
    console.log(`Successfully joined a Room: ${room}`);
    currentRoom = room;
    toggleButtons();
    connected();

    // adding yourself to the online list
    connectionCount++;
    addUser(username, room.localParticipant.sid);

    // for participants already in the room before me
    room.participants.forEach(participant => {
      console.log(`Participant "${participant.identity}" is connected to the Room`);

      connectionCount++;
      addUser(participant.identity, participant.sid, false);

      subscribeTrack(participant);
    });

    // Participants as they connect to the Room
    room.on('participantConnected', participant => {
      console.log(`Participant "${participant.identity}" connected`);

      connectionCount++;
      addUser(participant.identity, participant.sid, false);
      subscribeTrack(participant);
    });

    // Participants as they disconnect from the Room
    room.on('participantDisconnected', participant => {
      console.log(`Participant "${participant.identity}" has disconnected from the Room`);

      connectionCount--;
      document.getElementById(participant.sid).remove();
      removeUser(participant.identity, participant.sid);
    });

    // disconnecting self from the room
    room.on('disconnected', room => {
      console.log("Disconnected from the room");

      toggleButtons();
      resetOnlineUsers();
      disconnected();
      connectionCount = 0;
      resetParticipantTrack();
    });

    // detecting participants who are currently executing push-to-talk
    room.on('trackPublished', function (publication, participant) {
      document.getElementById(participant.sid).classList.remove("hide");
      userTalking(participant.sid);
    });

    // detecting participants who let go of the push-to-talk button
    room.on('trackUnsubscribed', function (track, participant) {
      track.detach().forEach(function (mediaElement) {
        mediaElement.classList.add("hide");
        userStoppedTalking(participant.sid);
      });
    });
  }, error => {
    console.error(`Unable to connect to Room: ${error.message}`);
  });
}

function disconnect() {
  currentRoom.disconnect();
}

/* ====================== END OF TWILIO API ====================== */













/* ====================== START OF APP METHODS ====================== */

// adding yourself or other users available in the chat room
function addUser(identity, participantSid) {
  updateUserCount();

  var name = identity;

  var nameElement = document.createElement('p');
  nameElement.id = participantSid;
  nameElement.classList = "chip";
  nameElement.innerHTML = name;

  var soundElement = document.createElement('button');
  soundElement.id = participantSid + "-sound";
  soundElement.classList = "btn-floating waves-effect waves-light grey material-icons";

  // connection detected is yourself
  if (participantSid == currentRoom.localParticipant.sid)
    nameElement.innerHTML += " (You)";
  else
    M.toast({
      html: name + " joined the channel"
    });

  nameElement.prepend(soundElement);
  document.getElementById("onlineUsers").appendChild(nameElement);
}

// users left the room
function removeUser(identity, participantSid) {
  M.toast({
    html: identity + " left the channel"
  });

  updateUserCount();
  document.getElementById(participantSid).remove();
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

function resetParticipantTrack() {
  var node = document.getElementById("participantTrack");
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

// turn on walkie talkie
function pushTalk() {
  publish();

  document.getElementById("pushBtn").classList.add("pulse-slow-animation");
}

// turn off walkie talkie
function stopTalk() {
  if (tracks.length) {
    tracks.forEach(function (track) {
      track.stop();
      currentRoom.localParticipant.unpublishTrack(track);
      document.getElementById("publisher").innerHTML = '';
    });
  }

  unpublishedSettings();
  document.getElementById("pushBtn").classList.remove("pulse-slow-animation");
}

function userTalking(participantSid) {
  document.getElementById(participantSid + "-sound").innerHTML = "volume_up";
}

function userStoppedTalking(participantSid) {
  document.getElementById(participantSid + "-sound").innerHTML = "";
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