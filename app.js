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
          request.username = user.username;
          next();
          //   console.log(user.username);
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
  const { username } = request;
  const user_det_qry = `select user_id from user where username="${username}";`;
  const login_user_obj = await db.get(user_det_qry);
  const login_user_id = login_user_obj.user_id;

  const _4_feeds_query = `select username,tweet.tweet,tweet.date_time as dateTime from (tweet join follower on
  tweet.user_id= follower.following_user_id) as t join user on user.user_id =tweet.user_id where follower.follower_user_id=${login_user_id} order by tweet.date_time desc limit 4;`;
  console.log(_4_feeds_query);
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
  const { username } = request;
  //   console.log(username);
  const qry_details_of_username = `select user_id from user where username="${username}";`;
  const user_id1 = await db.get(qry_details_of_username);
  //   response.send(user_id1);
  //   console.log(qry_details_of_username);
  //   console.log(user_id1.user_id);
  const qry_for_following_names = `select distinct name
   from user join follower on user.user_id
    =follower.following_user_id where follower_user_id=${user_id1.user_id} ;`;
  const following_names_lis = await db.all(qry_for_following_names);
  console.log(following_names_lis);
  response.send(following_names_lis);
});

// api 5 --->>>  to get followers of the user :

app.get("/user/followers/", authenticateFn, async (request, response) => {
  const { username } = request;
  //   console.log(username);
  const qry_details_of_username = `select user_id from user where username="${username}";`;
  const user_id1 = await db.get(qry_details_of_username);
  const login_user_id = user_id1.user_id;
  const qry_to_ret_followers_list = `select distinct name from (user join follower on user.user_id=
    follower.follower_user_id) where follower.following_user_id=${login_user_id} ;`;
  const followers_lis = await db.all(qry_to_ret_followers_list);
  console.log(followers_lis);
  response.send(followers_lis);
});

// api 6 --->>> for tweets of specific id

app.get("/tweets/:tweetId", authenticateFn, async (request, response) => {
  const { username } = request;
  const { tweetId } = request.params;
  const user_qry = `select user_id from user where username="${username}";`;
  const login_user_obj = await db.get(user_qry);
  const login_user_id = login_user_obj.user_id;
  let all_tweets_by_user_qry = `select tweet_id from tweet where user_id=${login_user_id};`;
  let all_tweets_by_user = await db.all(all_tweets_by_user_qry);

  let all_tweets_lis_by_user = [];
  for (let e of all_tweets_by_user) {
    all_tweets_lis_by_user.push(e.tweet_id);
  }
  let all_tweets_lis = [];
  let all_tweets_qry = `select tweet_id from tweet ;`;
  let all_tweets = await db.all(all_tweets_qry);
  for (let f of all_tweets) {
    all_tweets_lis.push(f.tweet_id);
  }
  console.log(all_tweets_lis);
  console.log(parseInt(tweetId));
  console.log(all_tweets_lis.includes(parseInt(tweetId)));
  if (all_tweets_lis.includes(parseInt(tweetId))) {
    //   valid tweet
    if (all_tweets_lis_by_user.includes(parseInt(tweetId))) {
      // valid request
      let tweet_details = [];
      for (let k of all_tweets_lis_by_user) {
        const twts_qry = `select tweet,count(like_id) as likes,count(reply) as replies, tweet.date_time as dateTime from (tweet join like on tweet.tweet_id
                =like.tweet_id) as n join reply on reply.tweet_id=n.tweet_id where tweet.tweet_id=${k};`;
        const lis = await db.all(twts_qry);
        console.log(lis[0]);
        tweet_details.push(lis[0]);
        // tweet_details.push(lis[0])
        // console.log(lis);
      }
      response.send(tweet_details);
    } else {
      //   not tweeted by your following users, so u r not accessible to it
      response.status(401);
      response.send("Invalid Request");
    }
  }
});

// api for list of users who liked specific tweet, where only tweets
// of whom login_user is following ;
app.get(
  "/tweets/:tweetId/likes/",
  authenticateFn,
  async (request, response) => {
    const { username } = request;
    const { tweetId } = request.params;
    const user_qry = `select user_id from user where username="${username}";`;
    const login_user_obj = await db.get(user_qry);
    const login_user_id = login_user_obj.user_id;
    const list_obj_following_user_ids_qry = `select user_id from user join
    follower on follower.following_user_id = user.user_id 
    where follower.follower_user_id=${login_user_id};`;
    const list_obj_following_user_ids = await db.all(
      list_obj_following_user_ids_qry
    );
    // console.log(list_obj_following_user_ids);
    const arr = [];
    for (let x of list_obj_following_user_ids) {
      arr.push(x.user_id);
      //   console.log(x.user_id);
    }
    const all_user_following_tweets = [];
    for (let x of arr) {
      const tweets_qry = `select tweet_id from tweet where user_id=${x};`;
      const tweets = await db.all(tweets_qry);
      //   console.log(tweets);
      for (let x of tweets) {
        console.log(x.tweet_id, typeof x.tweet_id);
        if (all_user_following_tweets.includes(x.tweet_id) === false) {
          all_user_following_tweets.push(x.tweet_id);
        }
      }
      console.log(all_user_following_tweets.includes(parseInt(tweetId)));
      // all_user_following_tweets.push(tweets);
    }
    if (all_user_following_tweets.includes(parseInt(tweetId))) {
      // user request is valid
      const x = `select username from user join like on user.user_id
       = like.user_id where like.tweet_id=${tweetId};`;
      let user_names_list = [];
      const liked_user_names_list = await db.all(x);
      for (let i of liked_user_names_list) {
        console.log(i.username);
        user_names_list.push(i.username);
      }
      response.send({ likes: user_names_list });

      console.log({ likes: user_names_list });
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
    // console.log(arr);
    // if (re.length === 0) {
    //   response.status(400);
    //   response.send("Invalid Request");
    // } else {
    //   console.log({ likes: arr });
    //   response.send({ likes: arr });
    // }
  }
);

// app.get("/c/", async (request, response) => {
//   const users_who_liked_tweetId = `select distinct user.username from like join user on user.user_id=like.user_id
//    where 1 in (select tweet_id from tweet join follower on follower.following_user_id=tweet.user_id where user.user_id=1);`;
//   const names = await db.all(users_who_liked_tweetId);
//   let arr = [];
//   for (let x of names) {
//     arr.push(x.username);
//     console.log(x);
//   }
//   response.send({ likes: arr });
// });

// ---------------------------------------11-----11-----11----11----11

// delete tweet api

app.delete("/tweets/:tweetId/", authenticateFn, async (request, response) => {
  const { tweetId } = request.params;
  const { username } = request;
  console.log(username);
  const sel_user_qry = `select user_id from user where username="${username}";`;
  const user_id_s = await db.get(sel_user_qry);
  const user_id_r = user_id_s.user_id;
  console.log(user_id_r);

  const user_tweets_qry = `select tweet_id from tweet where user_id=${user_id_r};`;
  const user_tweets = await db.all(user_tweets_qry);
  let tweet_ids_of_user = [];
  for (let id of user_tweets) {
    // console.log(id.tweet_id);
    tweet_ids_of_user.push(id.tweet_id);
  }
  console.log(tweet_ids_of_user);
  //   console.log("all_tweets", user_tweets);
  //   console.log(del_tweet_qry);

  console.log(tweetId, typeof parseInt(tweetId));
  console.log(tweet_ids_of_user.includes(parseInt(tweetId)));
  if (tweet_ids_of_user.includes(parseInt(tweetId))) {
    const del_tweet_qry = `delete from tweet where tweet_id=${tweetId};`;
    await db.run(del_tweet_qry);

    response.send("Tweet Removed");
  } else {
    response.status(401);
    response.send("Invalid Request");
  }
});

// api 10 creating a tweet in tweet table

app.post("/user/tweets/", authenticateFn, async (request, response) => {
  const { username } = request;
  const { tweet } = request.body;
  const usr_id_qry = `select user_id from user where username="${username}";`;
  const usr = await db.get(usr_id_qry);
  const usrr = usr.user_id;
  const d = new Date();
  console.log(d);
  const post_twt_qry = `insert into tweet (tweet,user_id,date_time)
       values("${tweet}",${usrr},"${d}");`;
  console.log(post_twt_qry);
  await db.run(post_twt_qry);
  response.send("Created a Tweet");
});

// api 9 for retrieving user tweets

app.get("/user/tweets/", authenticateFn, async (request, response) => {
  const { username } = request;
  const sel_qry = `select user_id from user where username="${username}";`;
  const usr_d = await db.get(sel_qry);
  const user_D = usr_d.user_id;
  //   console.log(user_D);
  let all_tweets_by_user_query = `select tweet_id from tweet where user_id=${user_D};`;
  let all_tweets_by_user = await db.all(all_tweets_by_user_query);
  //   console.log(all_tweets_by_user);
  let all_tweets_ids_list = [];
  for (let x of all_tweets_by_user) {
    // console.log(x.tweet_id);
    all_tweets_ids_list.push(x.tweet_id);
  }
  let tweet_details = [];
  for (let k of all_tweets_ids_list) {
    const twts_qry = `select tweet,count(like_id) as likes,count(reply) as replies, tweet.date_time as dateTime from (tweet join like on tweet.tweet_id
        =like.tweet_id) as n join reply on reply.tweet_id=n.tweet_id where tweet.tweet_id=${k};`;
    const lis = await db.all(twts_qry);
    console.log(lis[0]);
    tweet_details.push(lis[0]);
    // tweet_details.push(lis[0])
    // console.log(lis);
  }
  response.send(tweet_details);
});

// api 8
app.get(
  "/tweets/:tweetId/replies/",
  authenticateFn,
  async (request, response) => {
    const { username } = request;
    const { tweetId } = request.params;
    const user_qry = `select user_id from user where username="${username}";`;
    const login_user_obj = await db.get(user_qry);
    const login_user_id = login_user_obj.user_id;
    //     const sr = `select distinct user.username from like join user on user.user_id=like.user_id
    //    where like.tweet_id = (select tweet_id from like join follower on follower.following_user_id=like.user_id where follower.follower_user_id=${login_user_id} and like.tweet_id=${tweetId}) ;`;
    const list_of_following_tweet_ids_qry = `select user.user_id from user join follower 
   on user.user_id =follower.following_user_id where follower.follower_user_id=${login_user_id};`;
    const list_of_following_tweet_ids = await db.all(
      list_of_following_tweet_ids_qry
    );
    // console.log(list_of_following_users);
    // console.log(sr);
    // const re = await db.all(sr);
    let arr = [];
    for (let x of list_of_following_tweet_ids) {
      arr.push(x.user_id);
      //   console.log(x.user_id);
    }
    let tweets_of_following_users = [];
    for (let a of arr) {
      const list_of_following_users_tweet_qry = `select tweet_id from tweet where user_id=${a};`;
      const list_of_following_users_tweet = await db.all(
        list_of_following_users_tweet_qry
      );
      for (let j of list_of_following_users_tweet) {
        // console.log(j.tweet_id);
        if (tweets_of_following_users.includes(j.tweet_id) === false) {
          tweets_of_following_users.push(j.tweet_id);
        }
      }
    }
    let all_tweets_list = [];
    const all_tweets_qry = `select tweet_id from tweet;`;
    const all_tweets = await db.all(all_tweets_qry);
    for (let q of all_tweets) {
      console.log(q.tweet_id, typeof q.tweet_id);
      all_tweets_list.push(q.tweet_id);
    }

    console.log(tweets_of_following_users);
    // if (re.length === 0) {
    //   response.status(400);
    //   response.send("Invalid Request");
    // } else {
    //   console.log({ replies: arr });
    //   response.send({ replies: arr });
    // }
    console.log(all_tweets_list);
    console.log(tweetId, typeof tweetId);
    console.log(all_tweets_list.includes(tweetId));
    let pass = null;
    if (all_tweets_list.includes(parseInt(tweetId)) === false) {
      // invalid tweet which is not present in the entire tweets list
      console.log("tweet not found in database");
      response.status(401);
      response.send("Invalid Request");
    } else {
      if (tweets_of_following_users.includes(parseInt(tweetId)) === false) {
        // tweet not belongs to the following profiles
        console.log("tweet is valid but you are not following the user");
        response.status(401);
        response.send("Invalid Request");
      } else {
        // tweet is authenticated
        //  name and reply by a specific tweet_id
        console.log("user is valid and we will update results");
        const nam_rep_qry = `select name,reply from user join reply on user.user_id
        = reply.user_id where reply.tweet_id =${tweetId}; `;
        const nam_rep = await db.all(nam_rep_qry);
        console.log({ replies: nam_rep });
        response.send({ replies: nam_rep });
      }
    }
  }
);
