const { Model } = require('objection');
const axios = require('axios');

class Event extends Model {
  static get tableName() {
    return 'events';
  }

  static async saveEvent(json) {
    console.log('Event JSON', json);
    const userNameFetch = await axios.get(`https://api.twitch.tv/kraken/users/${json.event.broadcaster_user_id}`);
    const value = {
      streamer_name: userNameFetch.display_name,
      viewer_name: json.event.user_id,
      event_type: json.subscription.type,
    };
    Event.query().insert(value);
  }
  // static async findAccountByEmail(email) {
  //   let acc = await Account.query().where('email', email);
  //   if (acc[0].parent_account != null) {
  //     acc = acc.parent_account
  //   }
  //   return acc[0];
  // }
  // subAccounts() {
  //   var _this = this;
  //   return Account.query().where('parent_account', _this.id).then(function (acc) {
  //     return acc;
  //   });
  // }
}

module.exports = Event;
