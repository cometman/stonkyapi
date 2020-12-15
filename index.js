const express = require('express');
const https = require('https');
const bodyParser = require('body-parser');
const { Server } = require('ws');

// const websocketServer = new WebSocket.Server({ port: 3030 });

const app = express();
const websocketServer = new Server({ server: app });
const port = 8000;
const TWITCH_SECRET = 'bo8pi74tz8so3hdx88qciuns7q8b3f';
const TWITCH_CLIENT_ID = 'ams7dmtzp7zv8gi4d1smuodlspral7';
const API_BASE_URL = 'https://stonkyapi.herokuapp.com';
// const API_BASE_URL = 'http://localhost:8000';
// const API_BASE_URL = 'https://a921b52a0d57.ngrok.io';
const API_FRONT_END_URL = 'https://aqueous-sierra-81716.herokuapp.com';
// const API_FRONT_END_URL = 'http://localhost:3000';
const TWITCH_REDIRECT_URL = `${API_BASE_URL}/auth`;
const FRONT_END_LANDING_URL = `${API_FRONT_END_URL}/login`;

const Knex = require('knex');
const { Model } = require('objection');
const Event = require('./models/Events');
const knexConfig = require('./knexfile');

const environment = process.env.environment || 'development';
const knex = Knex(knexConfig[environment]);

// TODO
// make a process to refresh this access token automatically
const TWITCH_APP_ACCESS_TOKEN = 'sk8a1zyk4qyx39tly5m8qwbzhp1m1x';

Model.knex(knex);

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Fetch the broadcast ID of twitch streamer
const getBroadcastID = async (streamerName) => {
  const options = {
    hostname: 'api.twitch.tv',
    port: 443,
    path: `/helix/users?login=${streamerName}`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${TWITCH_APP_ACCESS_TOKEN}`,
      'Client-id': TWITCH_CLIENT_ID,
      'Content-Type': 'application/json',
    },
  };

  return new Promise((resolve, reject) => {
    const broadReq = https.request(options, (_res) => {
      const data = [];
      _res.on('data', (chunk) => {
        data.push(chunk);
      });

      _res.on('error', (d) => {
        console.log('error', d);
        reject(d);
      });

      _res.on('end', () => {
        const buffer = Buffer.concat(data);
        const broadcastData = JSON.parse(buffer.toString());
        resolve(broadcastData.data[0].id);
      });
    });
    broadReq.end();
  });
};

app.get('/', async (req, res) => {
  // const tokenTest = await getBroadcastID('moonmoon');
  await Event.query().insert({ streamer_name: 'clay', event_type: 'subscriber', viewer_name: 'danie' });
  res.send('Stonky API is up');
});

app.get('/view', async (req, res) => {
  const events = await Event.query();
  res.send(events);
});

app.post('/webhooks/twitch', async (req, res) => {
  // Send back the challenge to verify. # https://dev.twitch.tv/docs/eventsub
  console.log('Webhooks POST Twitch', req.body);
  try {
    Event.saveEvent(req.body);
    res.status(200).send('Event saved');
  } catch (err) {
    console.log(err);
  }
});

app.get('/webhooks/twitch', async (req, res) => {
  // Send back the challenge to verify. # https://dev.twitch.tv/docs/eventsub
  console.log('Webhooks GET Twitch Params', req.query);
  console.log('Webhook challenge', req.query['hub.challenge']);
  const challenge = req.query['hub.challenge'];
  res.set('Content-Type', 'text/plain');
  res.status(200).send(challenge);
});

app.post('/follow', async (req, res) => {
  const { streamerName } = req.body.streamerName;

  const broadcastID = await getBroadcastID(streamerName);
  const options = {
    hostname: 'api.twitch.tv',
    port: 443,
    path: '/helix/webhooks/hub',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TWITCH_APP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Client-ID': TWITCH_CLIENT_ID,
    },
  };

  async function registerSubscription(subType) {
    const body = JSON.stringify({
      'hub.callback': `${API_BASE_URL}/webhooks/twitch`,
      'hub.mode': 'subscribe',
      'hub.topic': subType,
      'hub.lease_seconds': 864000,
    });

    const startSubscription = new Promise((resolve, reject) => {
      const twReq = https.request(options, (twRes) => {
        const data = [];
        twRes.on('data', (d) => {
          data.push(d);
          process.stdout.write(d);
        });

        twRes.on('end', () => {
          const buffer = Buffer.concat(data);

          console.log('Buffer', buffer.toString());
          resolve();
        });
      });

      twReq.on('error', (error) => {
        console.error(error);
        reject(error);
      });

      twReq.write(body);
      twReq.end();
    });
    await startSubscription;
  }

  // Types of subscription events we want to listen to
  const subscriptionTypes = [`https://api.twitch.tv/helix/users/follows?first=1&to_id=${broadcastID}`];

  subscriptionTypes.forEach((subType) => {
    registerSubscription(subType);
  });
});

app.get('/auth', async (req, res) => {
  const authCode = req.query.code;
  const requestType = req.query.type;
  let url;
  // If this is an app token request,
  if (requestType === 'app') {
    url = `/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_SECRET}&grant_type=client_credentials`;
  } else {
    url = `/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_SECRET}&code=${authCode}&grant_type=authorization_code&redirect_uri=${FRONT_END_LANDING_URL}`;
  }
  // If auth code is in payload, peform token exchange;
  if (!authCode && requestType !== 'app') {
    res.send('Error, auth code required');
  }
  const options = {
    hostname: 'id.twitch.tv',
    port: 443,
    path: url,
    method: 'POST',
    // headers: {
    //   'Content-Type': 'application/json',
    // },
  };

  const accessTokenReq = https.request(options, (_res) => {
    console.log(`statusCode: ${_res.statusCode}`);
    console.log('Body', _res);
    const data = [];
    _res.on('data', (chunk) => {
      data.push(chunk);
    });

    _res.on('error', (d) => {
      console.log('error', d);
    });

    _res.on('end', () => {
      const buffer = Buffer.concat(data);
      const oauthData = JSON.parse(buffer.toString());
      console.log(oauthData);
      if (requestType === 'app') {
        res.send({ accessToken: oauthData.access_token });
      } else {
        res.redirect(`${FRONT_END_LANDING_URL}?access_token=${oauthData.access_token}`);
      }
    });
  });

  accessTokenReq.on('error', (err) => {
    console.log(err);
  });

  accessTokenReq.end();
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port} !`);
});

// when a websocket connection is established
websocketServer.on('connection', (webSocketClient) => {
  webSocketClient.send('{ "connection" : "true"}');
  let lastEvent = null;
  async function pollEvents() {
    websocketServer
      .clients
      .forEach(async (client) => {
        const recentEvent = (await Event.query().orderBy('created_at', 'desc'))[0].toJSON();
        if (!lastEvent || (lastEvent.viewer_name !== recentEvent.viewer_name)) {
          lastEvent = recentEvent;
          client.send(`{"message": ${JSON.stringify(recentEvent)}}`);
        }

        // }
      });
    // await Event.query();`
  }

  setInterval(pollEvents, 1000);
});
