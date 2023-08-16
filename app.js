const express = require('express');
const admin = require("firebase-admin");

const app = express();

// TODO: Enter the path to your service account json file
// Need help with this step go here: https://firebase.google.com/docs/admin/setup

const serviceAccount = require("./dugan-760bc-firebase-adminsdk-bguij-42efe32ea8.json");
// TODO: Enter your database url from firebase

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://dugan-760bc.firebaseio.com"
});

app.set('port', (process.env.PORT || 5000));

// get user 
app.get('/:user', function(req, res) {
    return res.send("username is set to " + req.params.user);
});

app.get('/', function (req, res) {
      res.send('CFM Stats');
});

// delete user data
app.get('/delete/:user', function(req, res) {
    const db = admin.database();
    const ref = db.ref();
    const dataRef = ref.child(req.params.user);
    dataRef.remove();
    return res.send('Madden Data Cleared for ' + req.params.user);
});

// league teams
app.post('/:username/:platform/:leagueId/leagueteams', (req, res) => {
    const db = admin.database();
    const ref = db.ref();
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        const { leagueTeamInfoList: teams } = JSON.parse(body);
        const { params: { username, leagueId } } = req;

        const teamRef = ref.child(`${username}/${leagueId}/data/leagueteams/leagueTeamInfoList`);
        teamRef.set(teams);
        
        res.sendStatus(200);
    });
});


// standings
app.post('/:username/:platform/:leagueId/standings', (req, res) => {
    const db = admin.database();
    const ref = db.ref();
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        const { teamStandingInfoList: teams } = JSON.parse(body);
        const {params: { username, leagueId }} = req;

        const teamRef = ref.child(`${username}/${leagueId}/data/standings/teamStandingInfoList`);
        teamRef.set(teams);

        res.sendStatus(200);
    });
});

// capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// schedules and stats
app.post('/:username/:platform/:leagueId/week/:weekType/:weekNumber/:dataType', (req, res) => {
    const db = admin.database();
    const ref = db.ref();
    const { params: { username, leagueId, weekType, weekNumber, dataType }, } = req;

    //const basePath = `${username}/${leagueId}/data/week/${weekType}/${weekNumber}/${dataType}`;
    
    // "defense", "kicking", "passing", "punting", "receiving", "rushing"
    
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        switch (dataType) {
            case 'schedules': {
                const weekRef = ref.child(`${username}/${leagueId}/data/week/${weekType}/${weekNumber}/${dataType}/gameScheduleInfoList`);
                const { gameScheduleInfoList: schedules } = JSON.parse(body);
                weekRef.set(schedules);
                break;
            }
            case 'teamstats': {
                const weekRef = ref.child(`${username}/${leagueId}/data/week/${weekType}/${weekNumber}/${dataType}/teamStatInfoList`);
                const { teamStatInfoList: teamStats } = JSON.parse(body);
                weekRef.set(teamStats);
                break;
            }
            case 'defense': {
                const weekRef = ref.child(`${username}/${leagueId}/data/week/${weekType}/${weekNumber}/${dataType}/playerDefensiveStatInfoList`);
                const { playerDefensiveStatInfoList: defensiveStats } = JSON.parse(body);
                weekRef.set(defensiveStats);
                break;
            }
            default: {
                const property = `player${capitalizeFirstLetter(dataType)}StatInfoList`;
                const weekRef = ref.child(`${username}/${leagueId}/data/week/${weekType}/${weekNumber}/${dataType}/${property}`);
                const stats = JSON.parse(body)[property];
                weekRef.set(stats);
                break;
            }
        }
        res.sendStatus(200);
    });
});

// free agents
app.post('/:username/:platform/:leagueId/freeagents/roster', (req, res) => {
    const db = admin.database();
    const ref = db.ref();
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        const { rosterInfoList: teams } = JSON.parse(body);
        const { params: { username } } = req;
        const teamRef = ref.child(`${username}/${leagueId}/data/freeagents/rosterInfoList`);
        teamRef.set(teams);

        res.sendStatus(200);
    });       
});

// team rosters
app.post('/:username/:platform/:leagueId/team/:teamId/roster', (req, res) => {
    const db = admin.database();
    const ref = db.ref();
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        const { rosterInfoList: teams } = JSON.parse(body);
        const { params: { username, teamId } } = req;
        const teamRef = ref.child(`${username}/${leagueId}/data/team/${teamId}/rosterInfoList`);
        teamRef.set(teams);

        res.sendStatus(200);
    });
});
app.listen(app.get('port'), () =>
    console.log('Madden Data is running on port', app.get('port'))
);
