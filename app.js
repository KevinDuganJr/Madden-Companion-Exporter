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
    databaseURL: "https://dugan-760bc.firebaseio.com"
});

app.set('port', (process.env.PORT || 5000));

// Use express.json globally so handlers can await req.body
app.use(express.json({ limit: '5mb' }));

// get export id
app.get('/:exportId', function (req, res) {
    return res.send("exportId is set to " + req.params.exportId);
});

// delete export data
app.get('/delete/:exportId', async function (req, res) {
    const db = admin.database();
    const ref = db.ref();
    const dataRef = ref.child(req.params.exportId);
    try {
        await dataRef.remove();
        return res.status(200).json({ exported: true, message: 'Madden Data Cleared', exportId: req.params.exportId });
    } catch (err) {
        console.error('delete failed:', err);
        return res.status(500).json({ exported: false, error: 'delete_failed' });
    }
});

// league teams
app.post('/:exportId/:platform/:leagueId/leagueteams', async (req, res) => {
    const db = admin.database();
    const ref = db.ref();
    const { leagueTeamInfoList: teams } = req.body || {};
    const { params: { exportId, leagueId } } = req;

    if (!teams) return res.status(400).json({ exported: false, error: 'missing leagueTeamInfoList' });

    const teamRef = ref.child(`${exportId}/${leagueId}/leagueteams/leagueTeamInfoList`);
    try {
        await teamRef.set(teams);
        return res.status(200).json({ exported: true, dataType: 'leagueteams', count: Array.isArray(teams) ? teams.length : null });
    } catch (err) {
        console.error('leagueteams write failed:', err);
        return res.status(500).json({ exported: false, error: 'db_write_failed' });
    }
});

// standings
app.post('/:exportId/:platform/:leagueId/standings', async (req, res) => {
    const db = admin.database();
    const ref = db.ref();
    const { teamStandingInfoList: teams } = req.body || {};
    const { params: { exportId, leagueId } } = req;

    if (!teams) return res.status(400).json({ exported: false, error: 'missing teamStandingInfoList' });

    const teamRef = ref.child(`${exportId}/${leagueId}/standings/teamStandingInfoList`);
    try {
        await teamRef.set(teams);
        return res.status(200).json({ exported: true, dataType: 'standings', count: Array.isArray(teams) ? teams.length : null });
    } catch (err) {
        console.error('standings write failed:', err);
        return res.status(500).json({ exported: false, error: 'db_write_failed' });
    }
});

// capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// schedules and stats
app.post('/:exportId/:platform/:leagueId/week/:weekType/:weekNumber/:dataType', async (req, res) => {
    const db = admin.database();
    const ref = db.ref();
    const { params: { exportId, leagueId, weekType, weekNumber, dataType } } = req;
    const body = req.body || {};

    try {
        let count = null;
        switch (dataType) {
            case 'schedules': {
                const weekRef = ref.child(`${exportId}/${leagueId}/week/${weekType}/${weekNumber}/${dataType}/gameScheduleInfoList`);
                const schedules = body.gameScheduleInfoList;
                if (!schedules) throw new Error('missing gameScheduleInfoList');
                await weekRef.set(schedules);
                count = Array.isArray(schedules) ? schedules.length : null;
                break;
            }
            case 'teamstats': {
                const weekRef = ref.child(`${exportId}/${leagueId}/week/${weekType}/${weekNumber}/${dataType}/teamStatInfoList`);
                const teamStats = body.teamStatInfoList;
                if (!teamStats) throw new Error('missing teamStatInfoList');
                await weekRef.set(teamStats);
                count = Array.isArray(teamStats) ? teamStats.length : null;
                break;
            }
            case 'defense': {
                const weekRef = ref.child(`${exportId}/${leagueId}/week/${weekType}/${weekNumber}/${dataType}/playerDefensiveStatInfoList`);
                const defensiveStats = body.playerDefensiveStatInfoList;
                if (!defensiveStats) throw new Error('missing playerDefensiveStatInfoList');
                await weekRef.set(defensiveStats);
                count = Array.isArray(defensiveStats) ? defensiveStats.length : null;
                break;
            }
            default: {
                const property = `player${capitalizeFirstLetter(dataType)}StatInfoList`;
                const weekRef = ref.child(`${exportId}/${leagueId}/week/${weekType}/${weekNumber}/${dataType}/${property}`);
                const stats = body[property];
                if (!stats) throw new Error(`missing ${property}`);
                await weekRef.set(stats);
                count = Array.isArray(stats) ? stats.length : null;
                break;
            }
        }

        return res.status(200).json({ exported: true, dataType, weekType, weekNumber, count });
    } catch (err) {
        console.error('week write failed:', err);
        return res.status(500).json({ exported: false, error: err.message || 'db_write_failed' });
    }
});

// free agents
app.post('/:exportId/:platform/:leagueId/freeagents/roster', async (req, res) => {
    const db = admin.database();
    const ref = db.ref();
    const { rosterInfoList: teams } = req.body || {};
    const { params: { exportId, leagueId } } = req;

    if (!teams) return res.status(400).json({ exported: false, error: 'missing rosterInfoList' });

    const teamRef = ref.child(`${exportId}/${leagueId}/freeagents/rosterInfoList`);
    try {
        await teamRef.set(teams);
        return res.status(200).json({ exported: true, dataType: 'freeagents_roster', count: Array.isArray(teams) ? teams.length : null });
    } catch (err) {
        console.error('freeagents write failed:', err);
        return res.status(500).json({ exported: false, error: 'db_write_failed' });
    }
});

// team rosters
app.post('/:exportId/:platform/:leagueId/team/:teamId/roster', async (req, res) => {
    const db = admin.database();
    const ref = db.ref();
    const { rosterInfoList: teams } = req.body || {};
    const { params: { exportId, leagueId, teamId } } = req;

    if (!teams) return res.status(400).json({ exported: false, error: 'missing rosterInfoList' });

    const teamRef = ref.child(`${exportId}/${leagueId}/team/${teamId}/rosterInfoList`);
    try {
        await teamRef.set(teams);
        return res.status(200).json({ exported: true, dataType: 'team_roster', teamId, count: Array.isArray(teams) ? teams.length : null });
    } catch (err) {
        console.error('team roster write failed:', err);
        return res.status(500).json({ exported: false, error: 'db_write_failed' });
    }
});

// extra league information
app.post('/:exportId/:platform/:leagueId/extra', async (req, res) => {
    const db = admin.database();
    const ref = db.ref();
    const { leagueId, exportId } = req.params;
    const payload = req.body;

    if (!payload || Object.keys(payload).length === 0) {
        return res.status(400).send('missing json body');
    }

    const writes = [];
    writes.push(ref.child(`${exportId}/${leagueId}/extra`).set(payload));

    try {
        await Promise.all(writes);
        return res.sendStatus(200);
    } catch (err) {
        console.error('write failed:', err);
        return res.status(500).send('db_write_failed');
    }
});

app.listen(app.get('port'), () =>
    console.log('Madden Data is running on port', app.get('port'))
);