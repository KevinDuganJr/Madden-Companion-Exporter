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

app.set('port', (process.env.PORT || 3001));

// get user 
app.get('/:user', function(req, res) {  
  return res.send("username is set to " + req.params.user);
});

// delete user database
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
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
        const { leagueTeamInfoList: teams } = JSON.parse(body);
        const {params: { username, leagueId }} = req;

        teams.forEach(team => { const teamRef = ref.child(`${username}/data/leagueteams/leagueTeamInfoList/${team.teamId}`); teamRef.update(team); });

        res.sendStatus(200);
    });
});

app.post('/:username/:platform/:leagueId/standings', (req, res) => {
    const db = admin.database();
    const ref = db.ref();
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
        const { teamStandingInfoList: teams } = JSON.parse(body);
        const {params: { username, leagueId }} = req;

        teams.forEach(team => { const teamRef = ref.child(`${username}/data/standings/teamStandingInfoList/${team.teamId}`); teamRef.update(team); });

        res.sendStatus(200);
    });
});

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

app.post('/:username/:platform/:leagueId/week/:weekType/:weekNumber/:dataType', (req, res) => {
        const db = admin.database();
        const ref = db.ref();
        const { params: { username, leagueId, weekType, weekNumber, dataType }, } = req;
        // const dataRef = ref.child(`${username}/data/week/${weekType}/${weekNumber}/${dataType}`);
        const basePath = `${username}/data/week/${weekType}/${weekNumber}/${dataType}`;
        // "defense", "kicking", "passing", "punting", "receiving", "rushing"
        const statsPath = `${basePath}`;
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            switch (dataType) {
                case 'schedules': {
                    const weekRef = ref.child(`${basePath}/gameScheduleInfoList`);
                    const { gameScheduleInfoList: schedules } = JSON.parse(body);
                    weekRef.update(schedules);
                    break;
                }
                case 'teamstats': {
                    const { teamStatInfoList: teamStats } = JSON.parse(body);
                    teamStats.forEach(stat => { const weekRef = ref.child(`${basePath}/teamStatInfoList`);                        
                        weekRef.update(stat);
                    });
                    break;
                }
                case 'defense': {
                    const { playerDefensiveStatInfoList: defensiveStats } = JSON.parse(body);
                    defensiveStats.forEach(stat => { const weekRef = ref.child(`${basePath}/defenseStatInfoList`);
                        weekRef.update(stat);
                    });
                    break;
                }
                default: {
                    const property = `player${capitalizeFirstLetter(dataType)}StatInfoList`;
                    const stats = JSON.parse(body)[property];
                    stats.forEach(stat => { const weekRef = ref.child(`${basePath}/fixme`);
                        weekRef.update(stat);
                    });
                    break;
                }
            }

            res.sendStatus(200);
        });
    }
);

// ROSTERS
app.post('/:username/:platform/:leagueId/freeagents/roster', (req, res) => {
    const db = admin.database();
    const ref = db.ref();
    const { params: { username, leagueId, teamId } } = req;
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
        const { rosterInfoList } = JSON.parse(body);
        const dataRef = ref.child(`${username}/data/freeagents/rosterInfoList`);
        const players = {};
        rosterInfoList.forEach(player => { players[player.rosterId] = player; });
        dataRef.set(players, error => {
            if (error) {
                console.log('Data could not be saved.' + error);
            } else {
                console.log('Data saved successfully.');
            }
        });
        res.sendStatus(200);
    });    

});

app.post('/:username/:platform/:leagueId/team/:teamId/roster', (req, res) => {
    const db = admin.database();
    const ref = db.ref();
    const { params: { username, leagueId, teamId } } = req;
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
        const { rosterInfoList } = JSON.parse(body);
        const dataRef = ref.child(`${username}/teams/${teamId}/rosterInfoList`);
        const players = {};
        rosterInfoList.forEach(player => { players[player.rosterId] = player; });
        dataRef.set(players, error => {
            if (error) {
                console.log('Data could not be saved.' + error);
            } else {
                console.log('Data saved successfully.');
            }
        });
        res.sendStatus(200);
    });
});

app.listen(app.get('port'), () =>
    console.log('Madden Data is running on port', app.get('port'))
);
