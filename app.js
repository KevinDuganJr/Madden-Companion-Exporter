const express = require('express');
const admin = require("firebase-admin");

const app = express();
const port = process.env.PORT || 5000;

// TODO: Enter the path to your service account json file
// Need help with this step go here: https://firebase.google.com/docs/admin/setup

const serviceAccount = require("./dugan-760bc-firebase-adminsdk-bguij-42efe32ea8.json");
// TODO: Enter your database url from firebase

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://dugan-760bc.firebaseio.com"
});

// Define an example endpoint to fetch data
app.get('/fetch-data', async (req, res) => {
  try {
    const database = admin.database();
    const dataRef = database.ref('data'); // Replace with actual Firebase database path

    const snapshot = await dataRef.once('value');
    const data = snapshot.val();

    res.json(data);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
