var express = require('express');
var bodyParser = require('body-parser');
var admin = require("firebase-admin");

const app = express();


// TODO: Enter the path to your service account json file
// Need help with this step go here: https://firebase.google.com/docs/admin/setup
const serviceAccount = require("./dugan-760bc-firebase-adminsdk-bguij-42efe32ea8.json");

// TODO: Enter your database url from firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://dugan-760bc.firebaseio.com"
});

// Setup
// Change the default port here if you want for local dev.
app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/dist'));

app.use(bodyParser.json({type: 'application/json'}))
//app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

app.get('/:user', function(req, res) {
  //return res.send('Madden Data')
  return res.send("username is set to " + req.params.user);
});

//Clear firebase database
app.get('/delete/:user', function(req, res) {
  const db = admin.database();
  const ref = db.ref();
  const dataRef = ref.child(req.params.user);
  dataRef.remove();
  return res.send('Madden Data Cleared for ' + req.params.user);
});



app.post('/:username/:platform/:leagueId/leagueteams', (req, res) => {
  const db = admin.database();
  const ref = db.ref();
  const { params: { username } } = req;  
  const {platform, leagueId} = req.params;
  const dataRef = ref.child(`${username}/data/leagueteams`);
  const {body: {leagueTeamInfoList}} = req;
  

  dataRef.set({
    leagueTeamInfoList
  });
  res.sendStatus(200);
});

app.post('/:username/:platform/:leagueId/standings', (req, res) => {
  const db = admin.database();
  const ref = db.ref();
  const { params: { username } } = req;  
  const {platform, leagueId} = req.params;
  const dataRef = ref.child(`${username}/data/standings`);
  const {body: {teamStandingInfoList}} = req;

  dataRef.set({
    teamStandingInfoList
  });
  res.sendStatus(200);
});

app.post('/:username/:platform/:leagueId/week/:weekType/:weekNumber/:dataType', (req, res) => {
  const db = admin.database();
  const ref = db.ref();
  const { params: { username } } = req;  
  const {platform, leagueId, weekType, weekNumber, dataType} = req.params;
  const dataRef = ref.child(`${username}/data/week/${weekType}/${weekNumber}/${dataType}`);

  // method=POST path="/platform/leagueId/week/reg/1/defense"
  // method=POST path="/platform/leagueId/week/reg/1/kicking"
  // method=POST path="/platform/leagueId/week/reg/1/passing"
  // method=POST path="/platform/leagueId/week/reg/1/punting"
  // method=POST path="/platform/leagueId/week/reg/1/receiving"
  // method=POST path="/platform/leagueId/week/reg/1/rushing"

  switch(dataType) {
    case 'schedules':
      const {body: {gameScheduleInfoList}} = req;
      dataRef.set({
        gameScheduleInfoList
      });
      break;
    case 'teamstats':
      const {body: {teamStatInfoList}} = req;
      dataRef.set({
        teamStatInfoList
      });
      break;
    case 'defense':
      const {body: {playerDefensiveStatInfoList}} = req;
      dataRef.set({
        playerDefensiveStatInfoList
      });
      break;
    default:
      const {body} = req;
      const property = `player${capitalizeFirstLetter(dataType)}StatInfoList`;
      dataRef.set({
        [property]: body[property] || ''
      });
      break;
  }

  res.sendStatus(200);
});

// ROSTERS

app.post('/:username/:platform/:leagueId/freeagents/roster', (req, res) => {
  const db = admin.database();
  const ref = db.ref();
  const { params: { username } } = req;  
  const {platform, leagueId} = req.params;
  const dataRef = ref.child(`${username}/data/freeagents`);
  const {body: {rosterInfoList}} = req;
  res.sendStatus(202);
  dataRef.set({
    rosterInfoList
  });
});

app.post('/:username/:platform/:leagueId/team/:teamId/roster', (req, res) => {
  const db = admin.database();
  const ref = db.ref();
  const { params: { username } } = req;  
  const {platform, leagueId, teamId} = req.params;
  const dataRef = ref.child(`${username}/data/team/${teamId}`);
  const {body: {rosterInfoList}} = req;
  res.sendStatus(202);
  dataRef.set({
    rosterInfoList
  });
});

app.listen(app.get('port'), function() { console.log('Madden Companion Exporter is running on port', app.get('port')) });
