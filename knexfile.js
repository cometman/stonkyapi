module.exports = {

  development: {
    client: 'mysql',
    connection: {
      host: 'localhost',
      user: 'root',
      database: 'stonks',
    },
  },

  production: {
    client: 'mysql',
    connection: 'mysql://b740f8f4f5943d:e6a5cae5@us-cdbr-east-02.cleardb.com/heroku_5021072f724a751?reconnect=true',
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
    },
  },

};
