const { Model } = require('objection');
const axios = require('axios');

class Event extends Model {
  static get tableName() {
    return 'events';
  }

  static async saveEvent(json) {
    console.log('Event JSON', json);
    json.data.forEach(async (element) => {
      let username;
      try {
        const userNameFetch = await axios({
          method: 'get', // you can set what request you want to be
          url: `https://api.twitch.tv/helix/users?id=${element.to_id}`,
          headers: {
            Authorization: 'Bearer sk8a1zyk4qyx39tly5m8qwbzhp1m1x',
            'Client-id': 'ams7dmtzp7zv8gi4d1smuodlspral7',
          },
        });
        username = userNameFetch.data.data[0].display_name;
        if (username === '' || username === 'Undefined') {
          username = element.to_id;
        }
      } catch (err) {
        console.log(err);
        username = element.to_id;
      }
      const value = {
        streamer_name: username,
        viewer_name: element.from_name,
        event_type: 'follow', // TODO, when we expand this to other events we need to detect the event type
      };
      await Event.query().insert(value);
    });
  }
}

module.exports = Event;
