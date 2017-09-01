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
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

app.get('/', function(req, res) {
  return res.send('Madden Data')
});

//Clear firebase database
app.get('/delete', function(req, res) {
  const db = admin.database();
  const ref = db.ref();
  const dataRef = ref.child(`data`);
  dataRef.remove();
  return res.send('Madden Data Cleared')
});

app.post('/:username/:platform/:leagueId/team/:teamId/roster', (req, res) => {
  const db = admin.database();
  const ref = db.ref();
  const { params: { username } } = req;  
  const {platform, leagueId, teamId} = req.params;
  const dataRef = ref.child(`data/${platform}/${leagueId}/team/${teamId}`);
  const {body: {rosterInfoList}} = req;
  res.sendStatus(202);
  dataRef.set({
    rosterInfoList
  });
});

app.listen(app.get('port'), function() { console.log('Madden Companion Exporter is running on port', app.get('port')) });
