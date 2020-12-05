exports.up = (knex) => knex.schema.createTable('events', (t) => {
  t.string('streamer_name');
  t.string('event_type');
  t.string('viewer_name');
  t.timestamp('created_at').defaultTo(knex.fn.now());
});

exports.down = (knex) => knex.schema
  .dropTableIfExists('events');
