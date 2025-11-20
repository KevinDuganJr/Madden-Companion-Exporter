const express = require('express');
const admin = require("firebase-admin");

const app = express();

// Need help with this step go here: https://firebase.google.com/docs/admin/setup
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountJson) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set or empty!');
  process.exit(1); 
}

let serviceAccountObject;
try {
    serviceAccountObject = JSON.parse(serviceAccountJson);
} catch (e) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY environment variable as JSON:', e);
    process.exit(1); 
}

console.log('Firebase Admin SDK initialized successfully!');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccountObject),
    databaseURL: "https://cfmstats-501b6-default-rtdb.firebaseio.com"
});

app.set('port', (process.env.PORT || 5000));

// get user 
app.get('/:user', function(req, res) {
    return res.send("username is set to " + req.params.user);
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

        // saved under <leagueId>/...
        const teamRef = ref.child(`${leagueId}/leagueteams/leagueTeamInfoList`);
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

        const teamRef = ref.child(`${leagueId}/standings/teamStandingInfoList`);
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

    //const basePath = `${username}/data/week/${weekType}/${weekNumber}/${dataType}`;
    
    // "defense", "kicking", "passing", "punting", "receiving", "rushing"
    
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        switch (dataType) {
            case 'schedules': {
                const weekRef = ref.child(`${leagueId}/week/${weekType}/${weekNumber}/${dataType}/gameScheduleInfoList`);
                const { gameScheduleInfoList: schedules } = JSON.parse(body);
                weekRef.set(schedules);
                break;
            }
            case 'teamstats': {
                const weekRef = ref.child(`${leagueId}/week/${weekType}/${weekNumber}/${dataType}/teamStatInfoList`);
                const { teamStatInfoList: teamStats } = JSON.parse(body);
                weekRef.set(teamStats);
                break;
            }
            case 'defense': {
                const weekRef = ref.child(`${leagueId}/week/${weekType}/${weekNumber}/${dataType}/playerDefensiveStatInfoList`);
                const { playerDefensiveStatInfoList: defensiveStats } = JSON.parse(body);
                weekRef.set(defensiveStats);
                break;
            }
            default: {
                const property = `player${capitalizeFirstLetter(dataType)}StatInfoList`;
                const weekRef = ref.child(`${leagueId}/week/${weekType}/${weekNumber}/${dataType}/${property}`);
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
        const { params: { username, leagueId } } = req;
        const teamRef = ref.child(`${leagueId}/freeagents/rosterInfoList`);
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
        const { params: { username, leagueId, teamId } } = req;
        const teamRef = ref.child(`${leagueId}/team/${teamId}/rosterInfoList`);
        teamRef.set(teams);

        res.sendStatus(200);
    });
});

app.post('/:username/:platform/:leagueId/extra', express.json({ limit: '5mb' }), async (req, res) => {
    const db = admin.database();
    const ref = db.ref();
    const { leagueId } = req.params;
    const payload = req.body;

    if (!payload || Object.keys(payload).length === 0) {
        return res.status(400).send('missing json body');
    }
    
    const { availableWeekInfoList } = payload;
    const writes = [];

    writes.push(ref.child(`${leagueId}/extra`).set(payload));
    // if (availableWeekInfoList) {
    //     writes.push(ref.child(`${leagueId}/league/availableWeekInfoList`).set(availableWeekInfoList));
    // }

    try {        
        await Promise.all(writes);
        await ref.child(`${leagueId}/status`).set({ state: 'Complete', completedOn: Date.now() });
        return res.sendStatus(200);
    } catch (err) {
        console.error('write failed:', err);
        return res.status(500).send('db_write_failed');
    }
});
 

app.listen(app.get('port'), () =>
    console.log('Madden Data is running on port', app.get('port'))
);
