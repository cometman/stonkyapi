const { Model } = require('objection');
const axios = require('axios');

class Event extends Model {
  static get tableName() {
    return 'events';
  }

  static async saveEvent(json) {
    console.log('Event JSON', json);
    let username;
    try {
      const userNameFetch = await axios.get(`https://api.twitch.tv/kraken/users/${json.broadcaster_user_id}`);
      username = userNameFetch.display_name;
    } catch (err) {
      console.log(err);
      username = null;
    }
    const value = {
      streamer_name: username,
      viewer_name: json.user_name,
      event_type: 'follow', // TODO, when we expand this to other events we need to detect the event type
    };
    await Event.query().insert(value);
  }
}

module.exports = Event;
