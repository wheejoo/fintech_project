var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'username',
  password : 'password',
  database : 'databasename',
});
//username, passowrd, databasename 값 대입
 
connection.connect();
 
connection.query('SELECT * FROM user;', function (error, results, fields) {
    console.log(results);
});
 
connection.end();
