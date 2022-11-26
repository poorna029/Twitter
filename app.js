console.log("hi durgamma");
console.log("hi keerthana");

const express = require("express");

const app = express();
console.log("hi poorna");
app.use(express.json());
module.exports = app;

let db = null;
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "twitterClone.db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const initDBandServer = async () => {
  try {
    app.listen(3000, () => {
      console.log("server running at http://localhost:3000");
    });
    db = await open({ filename: dbPath, driver: sqlite3.Database });
  } catch (e) {
    console.log(`DBerror ${e.message}`);
    process.exit(1);
  }
};

initDBandServer();

// ------------------------------------------------>>>   111111111
// creating twitter_register_api

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const username_any_previous_records_qry = `select * from user where username="${username}";`;
  //   console.log(username_any_previous_records_qry);
  const user_details = await db.get(username_any_previous_records_qry);
  //   console.log(user_details);
  let len_of_pw = password.length;
  //   console.log(len_of_pw);
  const hashedPassword = await bcrypt.hash(password, 15);
  if (user_details !== undefined) {
    // so user already registered
    response.status(400);
    response.send("User already exists");
  } else {
    // user not registered ,so we have to register,
    //   if password is less than 6 digits send 400 code
    // and send "Password is too short"

    if (len_of_pw < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      //  in this we will create register query
      const reg_new_twt_acc_qry = `insert into user (name,username,password,gender)
            values( "${name}","${username}","${hashedPassword}",
            "${gender}");`;
      //   console.log(reg_new_twt_acc_qry);
      await db.run(reg_new_twt_acc_qry);
      response.send("User created successfully");
    }
  }
});

// login api ---------------------------->>> 222222222222222

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const username_any_previous_records_qry = `select * from user where username="${username}";`;
  //   console.log(username_any_previous_records_qry);
  const user_details = await db.get(username_any_previous_records_qry);
  //   console.log(user_details);
  const is_pw_same = await bcrypt.compare(password, user_details.password);
  //   console.log(is_pw_same);
  if (user_details === undefined) {
    //   user is not registered and trying to login,so
    // we have to say , "Invalid user" and with 400 code
    response.status(400);
    response.send("Invalid user");
  } else {
    //   user is registered but we have to authenticate user
    // if user password matches we need to send reply as jwt
    // else send "Invalid password" and code as 400

    if (is_pw_same === true) {
      const payload = { username: username };
      const jwtToken = await jwt.sign(payload, "lkjhgfdsa");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const authenticateFn = (request, response, next) => {
  const auth_input = request.headers["authorization"];
  console.log(auth_input);

  if (auth_input === undefined) {
    //   possibility1 : token not provided
    response.status(400);
    response.send("Invalid JWT Token");
  } else {
    // possibility2  : token is invalid
    //   possibility3 : correct token
    let jwtToken = auth_input.split(" ")[1];
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      const payload = jwt.verify(jwtToken, "lkjhgfdsa", (error, user) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          next();
        }
      });
    }
  }
};

// api for user_table

app.get("/userd/", async (request, response) => {
  const user_tab_qry = `select * from user;`;
  const user_table = await db.all(user_tab_qry);
  response.send(user_table);
});

// api for follower_table

app.get("/followerd/", async (request, response) => {
  const follower_tab_qry = `select * from follower;`;
  const follower_table = await db.all(follower_tab_qry);
  response.send(follower_table);
});

// api for tweet_table
app.get("/tweetd/", async (request, response) => {
  const tweet_tab_qry = `select * from tweet;`;
  const tweet_table = await db.all(tweet_tab_qry);
  response.send(tweet_table);
});

// api for reply_table
app.get(`/replyd/`, async (request, response) => {
  const reply_tab_qry = `select * from reply;`;
  const reply_table = await db.all(reply_tab_qry);
  response.send(reply_table);
});

// api for like_table
app.get("/liked/", authenticateFn, async (request, response) => {
  const like_tab_qry = `select * from like;`;
  const like_table = await db.all(like_tab_qry);
  response.send(like_table);
});

// recent feeds for the users ------------------>>> 33333333333
app.get("/user/tweets/feed/", authenticateFn, async (request, response) => {
  const _4_feeds_query = `select distinct user.username,tweet.tweet,tweet.date_time as dateTime from (user_id join tweet on 
    user.user_id=tweet.user_id) where user.user_id =follower.following_user_id order by tweet.date_time desc limit 4;`;
  const _4_feeds = await db.all(_4_feeds_query);
  console.log(_4_feeds);
  response.send(_4_feeds);
});

// merging follower and tweet

app.get("/follower_tweet/", async (request, response) => {
  const q = `select * from follower join tweet on tweet.user_id
    =follower.following_user_id order by tweet.date_time desc;`;
  const out = await db.all(q);
  response.send(out);
});

// api 4 --->>> to get lis_of_names_of_people_whom user_follows :

app.get("/user/following/", authenticateFn, async (request, response) => {
  const qry_for_following_names = `select distinct name from 
  (user join follower on user.user_id=follower.following_user_id );`;
  const following_names_lis = await db.all(qry_for_following_names);
  response.send(following_names_lis);
});

// api 5 --->>>  to get followers of the user :

app.get("/user/followers/", authenticateFn, async (request, response) => {
  const qry_to_ret_followers_list = `select distinct name from (user join follower on user.user_id=
    follower.follower_id) order by user.username ;`;
  const followers_lis = await db.all(qry_to_ret_followers_list);
  response.send(followers_lis);
});

// api 6 --->>> for tweets of specific id

app.get("/tweets/:tweetId", authenticateFn, async (request, response) => {
  const sr = `select distinct tweet,sum(like_id),sum(reply), date_time as dateTime  from (tweet join like on tweet.tweet_id=
    like.tweet_id) as t join reply
     on t.user_id=reply.user_id where tweet.tweet_id in (select tweet.tweet_id from (user join follower on user.user_id=
    follower.following_user_id) as j join tweet on tweet.user_id = user.user_id) ;`;
  console.log(sr);
  const re = await db.all(sr);
  if (re.length === 0) {
    response.status(400);
    response.send("Invalid Request");
  } else {
    response.send(re);
  }
});
