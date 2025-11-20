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

// Add global JSON body parser (avoid manual req.on('data') buffering)
app.use(express.json({ limit: '25mb' }));

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
app.post('/:username/:platform/:leagueId/extra', express.json({ limit: '25mb' }), async (req, res) => {
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
    const baseRef = db.ref(leagueId);

    // Read only the child paths we need in parallel (much lower memory than reading entire league)
    const paths = [
        'leagueteams/leagueTeamInfoList',
        'standings/teamStandingInfoList',
        'extra',
        'freeagents/rosterInfoList',
        'team'
    ];
    const reads = paths.map(p => baseRef.child(p).once('value'));
    const [leagueTeamsSnap, standingsSnap, extraSnap, freeagentsSnap, teamSnap] = await Promise.all(reads);

    const missing = [];
    const leagueTeams = leagueTeamsSnap.exists() ? leagueTeamsSnap.val() : null;
    const standings = standingsSnap.exists() ? standingsSnap.val() : null;
    const extra = extraSnap.exists() ? extraSnap.val() : null;
    const freeagents = freeagentsSnap.exists() ? freeagentsSnap.val() : null;
    const teamObj = teamSnap.exists() ? teamSnap.val() : {};

    if (!Array.isArray(leagueTeams) || leagueTeams.length === 0) missing.push('leagueteams.leagueTeamInfoList');
    if (!Array.isArray(standings)) missing.push('standings.teamStandingInfoList');
    if (!extra || Object.keys(extra).length === 0) missing.push('extra');
    if (!Array.isArray(freeagents)) missing.push('freeagents.rosterInfoList');

    const teamCount = teamObj ? Object.keys(teamObj).length : 0;
    if (teamCount < 32) missing.push(`team (have ${teamCount})`);

    if (missing.length) {
        console.log(`League ${leagueId}: not complete yet, missing: ${missing.join(', ')}`);
        return;
    }

    // Atomically mark Complete only when status is Processing
    const statusRef = db.ref(`${leagueId}/status`);

    // Diagnostic: read current status first
    const statusSnapBefore = await statusRef.once('value');
    console.log(`League ${leagueId}: status BEFORE txn ->`, statusSnapBefore.exists() ? statusSnapBefore.val() : '<missing>');

    const txnResult = await statusRef.transaction(current => {
        console.log(`League ${leagueId}: txn callback current ->`, current);
        if (!current) return;                       // abort if no status
        if (current.state !== 'Processing') return; // abort if not in Processing
        return { ...current, state: 'Complete', completedAt: Date.now() };
    });

    console.log(`League ${leagueId}: txnResult ->`, txnResult);
    if (txnResult && txnResult.committed) {
        console.log(`League ${leagueId}: Export COMPLETE (version ${txnResult.snapshot.val().exportVersion})`);
    } else {
        console.log(`League ${leagueId}: tx not committed; final status ->`, txnResult && txnResult.snapshot ? txnResult.snapshot.val() : '<no snapshot>');
    }
 }

app.listen(app.get('port'), () =>
    console.log('Madden Data is running on port', app.get('port'))
);
