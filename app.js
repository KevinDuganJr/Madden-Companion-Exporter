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
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
        const { leagueTeamInfoList: teams } = JSON.parse(body);
        const { leagueId } = req.params;

        await ensureProcessingState(leagueId);

        const teamRef = ref.child(`${leagueId}/leagueteams/leagueTeamInfoList`);
        await teamRef.set(teams);

        await tryMarkComplete(leagueId);

        res.sendStatus(200);
    });
});


// standings
app.post('/:username/:platform/:leagueId/standings', (req, res) => {
    const db = admin.database();
    const ref = db.ref();
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
        const { teamStandingInfoList: teams } = JSON.parse(body);
        const { leagueId } = req.params;

        await ensureProcessingState(leagueId);

        const teamRef = ref.child(`${leagueId}/standings/teamStandingInfoList`);
        await teamRef.set(teams);

        await tryMarkComplete(leagueId);

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
    
    // "defense", "kicking", "passing", "punting", "receiving", "rushing"
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', async () => {
        
        await ensureProcessingState(leagueId);
        
        switch (dataType) {
            case 'schedules': {
                const weekRef = ref.child(`${leagueId}/week/${weekType}/${weekNumber}/${dataType}/gameScheduleInfoList`);
                const { gameScheduleInfoList: schedules } = JSON.parse(body);
                await weekRef.set(schedules);
                break;
            }
            case 'teamstats': {
                const weekRef = ref.child(`${leagueId}/week/${weekType}/${weekNumber}/${dataType}/teamStatInfoList`);
                const { teamStatInfoList: teamStats } = JSON.parse(body);
                await weekRef.set(teamStats);
                break;
            }
            case 'defense': {
                const weekRef = ref.child(`${leagueId}/week/${weekType}/${weekNumber}/${dataType}/playerDefensiveStatInfoList`);
                const { playerDefensiveStatInfoList: defensiveStats } = JSON.parse(body);
                await weekRef.set(defensiveStats);
                break;
            }
            default: {
                const property = `player${capitalizeFirstLetter(dataType)}StatInfoList`;
                const weekRef = ref.child(`${leagueId}/week/${weekType}/${weekNumber}/${dataType}/${property}`);
                const stats = JSON.parse(body)[property];
                await weekRef.set(stats);
                break;
            }
        }

        await tryMarkComplete(leagueId);

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
    req.on('end', async () => {
        const { rosterInfoList: teams } = JSON.parse(body);
        const { params: { username, leagueId } } = req;
        await ensureProcessingState(leagueId);
        const teamRef = ref.child(`${leagueId}/freeagents/rosterInfoList`);
        try {
            await teamRef.set(teams);
            await tryMarkComplete(leagueId);
            res.sendStatus(200);
        } catch (err) {
            console.error('write failed:', err);
            res.status(500).send('db_write_failed');
        }
    });       
});

// team rosters
app.post('/:username/:platform/:leagueId/team/:teamId/roster', (req, res) => {
    const db = admin.database();
    const ref = db.ref();
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
        const { rosterInfoList: teams } = JSON.parse(body);
        const { leagueId, teamId } = req.params;

        await ensureProcessingState(leagueId);

        const teamRef = ref.child(`${leagueId}/team/${teamId}/rosterInfoList`);
        await teamRef.set(teams);

        await tryMarkComplete(leagueId);

        res.sendStatus(200);
    });
});


// extra league data
app.post('/:username/:platform/:leagueId/extra', express.json({ limit: '5mb' }), async (req, res) => {
    const db = admin.database();
    const ref = db.ref();
    const { leagueId } = req.params;
    const payload = req.body;

    if (!payload || Object.keys(payload).length === 0)
        {
            return res.status(400).send('missing json body');
        }

//    const { availableWeekInfoList } = payload;

    await ensureProcessingState(leagueId);

    const writes = [];
    writes.push(ref.child(`${leagueId}/extra`).set(payload));
    // if (availableWeekInfoList)
    // {
    //     writes.push(ref.child(`${leagueId}/league/availableWeekInfoList`).set(availableWeekInfoList));
    // }

    await Promise.all(writes);
    await tryMarkComplete(leagueId);

    res.sendStatus(200);
});
 
// ensure processing state middleware
async function ensureProcessingState(leagueId) {
    const db = admin.database();
    const statusRef = db.ref(`${leagueId}/status`);

    await statusRef.transaction(current => {
        // If missing or already Complete -> start new cycle
        if (!current || current.state === "Complete") {
            const newVersion = current && current.exportVersion ? current.exportVersion + 1 : 1;
            return {
                state: "Processing",
                exportVersion: newVersion,
                startedAt: Date.now()
            };
        }
        // otherwise leave unchanged
        return;
    });

    console.log(`League ${leagueId}: ensureProcessingState executed`);
}

async function tryMarkComplete(leagueId) {
    const db = admin.database();
    const leagueRef = db.ref(leagueId);
    // Read league snapshot (compatible with Realtime DB ref)
    const snapshot = await leagueRef.once('value');
    if (!snapshot.exists()) return;
    const data = snapshot.val();

    // Required nodes
    if (!data.leagueteams) return;
    if (!data.standings) return;
    if (!data.extra) return;
    if (!data.freeagents) return;
    // Require all 32 teams
    if (!data.team || Object.keys(data.team).length < 32) return;

    // Atomically mark the status Complete only if it's currently Processing
    const statusRef = db.ref(`${leagueId}/status`);
    const txnResult = await statusRef.transaction(current => {
        if (!current) return; // nothing to do
        if (current.state !== 'Processing') return; // only transition Processing -> Complete
        return {
            ...current,
            state: 'Complete',
            completedAt: Date.now()
        };
    });

    if (txnResult.committed) {
        const finalStatus = txnResult.snapshot.val();
        console.log(`League ${leagueId}: Export COMPLETE (version ${finalStatus.exportVersion})`);
    }
 }

app.listen(app.get('port'), () =>
    console.log('Madden Data is running on port', app.get('port'))
);
