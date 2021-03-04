const express = require('express');
const path = require('path');
const app = express();
const request = require('request');
var jwt = require('jsonwebtoken');
var auth = require('./lib/auth');
var moment = require('moment');

app.use(express.json());
//json 타입에 데이터 전송을 허용한다
app.use(express.urlencoded({ extended: false }));
//form 타입에 데이터 전송을 허용한다
app.use(express.static(path.join(__dirname, 'public')));//to use static asset

app.set('views', __dirname + '/views');
//뷰파일이 있는 디렉토리를 설정합니다
app.set('view engine', 'ejs');
//뷰엔진으로 ejs 사용한다 

var companyId = "companyId";
//comapnyid 대입

// connection.end();
app.get('/', function (req, res) {
  res.send('Hello World');
})

app.get('/signup', function(req, res){
    res.render('signup');
})

app.get('/login', function(req, res){
    res.render('login');
})

app.get('/main', function(req, res){
    res.render('main');
})

app.get('/balance', function(req, res){
    res.render('balance');
})

app.get('/qrcode', function(req, res){
    res.render('qrcode');
})

app.get('/qrreader', function(req, res){
    res.render('qrreader');
})

app.get('/authTest', auth, function(req, res){
    res.send("정상적으로 로그인 하셨다면 해당 화면이 보입니다.");
})

app.get('/authResult', function(req, res){
    var authCode = req.query.code;
    var option = {
        method : "POST",
        url : "https://testapi.openbanking.or.kr/oauth/2.0/token",
        header : {
            'Content-Type' : 'application/x-www-form-urlencoded'
        },
        form : {
            code : authCode,
            client_id : "cliend_id",
            client_secret : "client_secre",
            redirect_uri : "redirect_uri",
            grant_type : "authorization_code"
        }//적절한 값 대입
    }
    request(option, function(err, response, body){
        if(err){
            console.error(err);
            throw err;
        }
        else {
            var accessRequestResult = JSON.parse(body);
            console.log(accessRequestResult);
            res.render('resultChild', {data : accessRequestResult});
        }
    })
})

app.post('/signup', function(req, res) {
    var userName = req.body.userName;
    var userEmail = req.body.userEmail;
    var userPassword = req.body.userPassword;
    var userAccessToken = req.body.userAccessToken;
    var userRefreshToken = req.body.userRefreshToken;
    var userSeqNo = req.body.userSeqNo;

    console.log(userName, userEmail, userPassword, userAccessToken);
    var sql = "INSERT INTO user (name, email, password, accesstoken, refreshtoken, userseqno) VALUES (?,?,?,?,?,?)";
    connection.query(sql,[userName, userEmail, userPassword, userAccessToken, userRefreshToken, userSeqNo], function (err, result) {
        if(err){
            console.error(err);
            throw err;
        }
        else {
            res.json(1);
        }
    });
    
})

app.post('/login', function(req, res){
    var userEmail = req.body.userEmail;
    var userPassword = req.body.userPassword;
    console.log(userEmail, userPassword)
    var sql = "SELECT * FROM user WHERE email = ?";
    connection.query(sql, [userEmail], function(err, result){
        if(err){
            console.error(err);
            res.json(0);
            throw err;
        }
        else {
            if(result.length == 0){
                res.json(3)
            }
            else {
                var dbPassword = result[0].password;
                if(dbPassword == userPassword){
                    var tokenKey = "tokenkey" //대입
                    jwt.sign(
                      {
                          userId : result[0].id,
                          userEmail : result[0].email
                      },
                      tokenKey,
                      {
                          expiresIn : '10d',
                          issuer : 'fintech.admin',
                          subject : 'user.login.info'
                      },
                      function(err, token){
                          console.log('로그인 성공', token)
                          res.json(token)
                      }
                    )            
                }
                else {
                    res.json(2);
                }
            }
        }
    })

})

app.post('/list', auth, function(req, res){
    var user = req.decoded;
    // console.log(user);
    var sql = "SELECT * FROM user WHERE id = ?";
    connection.query(sql,[user.userId], function(err, result){
        if(err) throw err;
        else {
            var dbUserData = result[0];
            console.log(dbUserData);
            var option = {
                method : "GET",
                url : "https://testapi.openbanking.or.kr/v2.0/user/me",
                headers : {
                    Authorization : "Bearer " + dbUserData.accesstoken
                },
                qs : {
                    user_seq_no : dbUserData.userseqno
                }
            }
            request(option, function(err, response, body){
                if(err){
                    console.error(err);
                    throw err;
                }
                else {
                    var listRequestResult = JSON.parse(body);
                    res.json(listRequestResult)
                }
            })        
        }
    })
})

app.post('/balance', auth, function(req, res){
    var user = req.decoded;
    var finusernum = req.body.fin_use_num;
    var countnum = Math.floor(Math.random() * 1000000000) + 1;
    var transId = companyId + countnum;  
    var transdtime = moment(new Date()).format('YYYYMMDDhhmmss');
    // console.log(transdtime);
    var sql = "SELECT * FROM user WHERE id = ?";
    connection.query(sql,[user.userId], function(err, result){
        if(err) throw err;
        else {
            var dbUserData = result[0];
            console.log(dbUserData);
            var option = {
                method : "GET",
                url : "https://testapi.openbanking.or.kr/v2.0/account/balance/fin_num",
                headers : {
                    Authorization : "Bearer " + dbUserData.accesstoken
                },
                qs : {
                    bank_tran_id : transId,
                    fintech_use_num : finusernum,
                    tran_dtime : transdtime
                }
            }
            request(option, function(err, response, body){
                if(err){
                    console.error(err);
                    throw err;
                }
                else {
                    var balanceRquestResult = JSON.parse(body);
                    // console.log(balanceRquestResult);
                    res.json(balanceRquestResult)
                }
            })        
        }
    })
})

app.post('/transactionList', auth, function(req, res){
    var user = req.decoded;
    var finusernum = req.body.fin_use_num;
    var countnum = Math.floor(Math.random() * 1000000000) + 1;
    var transId = companyId + countnum;  
    var transdtime = moment(new Date()).format('YYYYMMDDhhmmss');
    // console.log(transdtime);
    var sql = "SELECT * FROM user WHERE id = ?";
    connection.query(sql,[user.userId], function(err, result){
        if(err) throw err;
        else {
            var dbUserData = result[0];
            console.log(dbUserData);
            var option = {
                method : "GET",
                url : "https://testapi.openbanking.or.kr/v2.0/account/transaction_list/fin_num",
                headers : {
                    Authorization : "Bearer " + dbUserData.accesstoken
                },
                qs : {
                    bank_tran_id : transId,
                    fintech_use_num : finusernum,
                    inquiry_type : " inquiry_type",
                    inquiry_base : "inquiry_base",
                    from_date : "from_date",
                    to_date : "to_date",
                    sort_order : "sort_order",
                    tran_dtime : transdtime
                }// 대입
            }
            request(option, function(err, response, body){
                if(err){
                    console.error(err);
                    throw err;
                }
                else {
                    var transactionListRquestResult = JSON.parse(body);
                    // console.log(transactionListRquestResult);
                    res.json(transactionListRquestResult)
                }
            })        
        }
    })
})

app.post('/withdraw', auth, function(req, res){
    //사용자 출금이체 API 수행하기
    // console.log(req.body);
    var user = req.decoded;
    var finusernum = req.body.fin_use_num;
    var countnum = Math.floor(Math.random() * 1000000000) + 1;
    var transId = companyId + countnum;  
    var transdtime = moment(new Date()).format('YYYYMMDDhhmmss');
    // console.log(transdtime);
    var sql = "SELECT * FROM user WHERE id = ?";
    connection.query(sql,[user.userId], function(err, result){
        if(err) throw err;
        else {
            var dbUserData = result[0];
            console.log(dbUserData);
            var option = {
                method : "POST",
                url : "https://testapi.openbanking.or.kr/v2.0/transfer/withdraw/fin_num",
                headers : {
                    Authorization : "Bearer " + dbUserData.accesstoken
                },
                json : {
                    bank_tran_id : transId,
                    cntr_account_type : "cntr_account_type",
                    cntr_account_num : "cntr_account_num",
                    dps_print_content : "dps_print_content",
                    fintech_use_num : finusernum,
                    wd_print_content: "wd_print_content",
                    tran_amt : "tran_amt",
                    tran_dtime : transdtime,
                    req_client_name : "req_client_name",
                    req_client_fintech_use_num : finusernum,
                    req_client_num : "req_client_num",
                    transfer_purpose : "transfer_purpose",
                    recv_client_name : "recv_client_name",
                    recv_client_bank_code : "recv_client_bank_code",
                    recv_client_account_num : "recv_client_account_num"
                }//대입
            }
            request(option, function(err, response, body){
                if(err){
                    console.error(err);
                    throw err;
                }
                else {
                    var transactionListResuult = body;
                    if(transactionListResuult.rsp_code === "A0000"){
                        var countnum2 = Math.floor(Math.random() * 1000000000) + 1;
                        var transId2 = companyId + countnum2;  
                        var transdtime2 = moment(new Date()).format('YYYYMMDDhhmmss');                    
                        var option = {
                            method : "POST",
                            url : "https://testapi.openbanking.or.kr/v2.0/transfer/deposit/fin_num",
                            headers : {
                              Authorization : "Bearer " + "accesstoken"//대입
                            },
                            //get 요청을 보낼때 데이터는 qs, post 에 form, json 입력가능
                            json : {
                              cntr_account_type: "cntr_account_type",
                              cntr_account_num: "cntr_account_num",
                              wd_pass_phrase: "wd_pass_phrase",
                              wd_print_content: "wd_print_content",
                              name_check_option: "name_check_option",
                              tran_dtime: transdtime2,
                              req_cnt: "req_cnt",
                              req_list: [
                                {
                                  tran_no: "tran_no",
                                  bank_tran_id: transId2,
                                  fintech_use_num: finusernum,
                                  print_content: "print_content",
                                  tran_amt: "tran_amt",
                                  req_client_name: "req_client_name",
                                  req_client_bank_code: "req_client_bank_code",
                                  req_client_account_num : "req_client_account_num",
                                  req_client_num: "req_client_num",
                                  transfer_purpose: "transfer_purpose"
                                }//대입
                              ]
                            }
                        }
                        request(option, function (error, response, body) {
                            console.log(body);
                            res.json(body);
                        });
                
                    }
                  
                }          
            })
        }
    }) 
})



var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'username',
  password : 'password',
  database : 'databasename',
});//대입

connection.connect();


app.listen(3000)
