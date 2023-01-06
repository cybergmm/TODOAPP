require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
var db;
const MongoClient = require('mongodb').MongoClient;
const methodOverride = require('method-override');
const crypto = require('crypto');
const util = require('util');

const randomBytesPromise = util.promisify(crypto.randomBytes);
const pbkdf2Promise = util.promisify(crypto.pbkdf2);

const createSalt = async () => {
	const buf = await randomBytesPromise(64);

	return buf.toString('base64');
};
const createHashedPassword = async (password) => {
	const salt = await createSalt();
	const key = await pbkdf2Promise(password, salt, 104906, 64, 'sha512');
	const hashedPassword = key.toString('base64');
	console.log(hashedPassword);
	console.log(salt);
	return { hashedPassword, salt };
};
// console.log(createHashedPassword('test'));

const verifyPassword = async (password, userSalt, userPassword) => {
	const key = await pbkdf2Promise(password, userSalt, 104906, 64, 'sha512');
	const hashedPassword = key.toString('base64');

	if (hashedPassword === userPassword) return true;
	return false;
};

app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

app.use('/public', express.static('public'));

MongoClient.connect(process.env.DB_URL, { useUnifiedTopology: true }, (error, client) => {
	// 연결되면 할일
	if (error) {
		return console.log(error);
	}

	db = client.db('todoapp');

	// db.collection('post').insertOne({name: 'sumin', age:29}, (error, result) => {
	//     console.log('저장완료');
	// });

	app.listen(process.env.PORT, () => {
		console.log('listening on 8080');
	});
});

app.get('/', function (req, res) {
	// res.sendFile(__dirname + '/index.ejs');
	res.render('index.ejs');
});

app.get('/write', function (req, res) {
	// res.sendFile(__dirname + '/write.ejs');
	res.render('write.ejs');
});

app.get('/pet', function (req, res) {
	res.send('펫용품 쇼핑할 수 있는 사이트입니다.');
});
// 누군가가 /pet으로 방문하면 .. pet 관련된 안내문을 띄워주자

app.get('/beauty', function (req, res) {
	res.send('뷰티 상품을 쇼핑할 수 있는 사이트입니다.');
});

app.post('/add', (req, res) => {
	//누군가 /add로 POST 요청
	res.send('전송완료');
	db.collection('counter').findOne({ name: '게시물갯수' }, (err, result) => {
		//db.counter 내의 총개시물갯수를 찾음
		console.log(result.totalPost);
		var totalCount = result.totalPost;

		db.collection('post').insertOne(
			{ _id: totalCount + 1, title: req.body.title, date: req.body.date },
			(error, result) => {
				//DB.post에 새게시물을 추가함
				console.log('저장완료');
				// counter라는 콜렉션에 있는 totalPost 라는 항목도 1 증가시켜야함 ->수정기능.
				db.collection('counter').updateOne(
					{ name: '게시물갯수' },
					{ $inc: { totalPost: 1 } },
					(err, result) => {
						//(어떤데이터를 수정할지,수정값)
						if (err) {
							return console.log(err);
						}
					}
				); //완료되면 db.counter 내의 총게시물갯수 +1을 해줌
			}
		);
	});

	// DB에 저장
});

app.get('/list', (req, res) => {
	db.collection('post')
		.find()
		.toArray((err, result) => {
			console.log(result);
			res.render('list.ejs', { posts: result });
		});
	// db에 저장된 post라는 collection안의 데이터를 꺼내자
});

app.delete('/delete', (req, res) => {
	console.log(req.body);
	req.body._id = parseInt(req.body._id);
	// req.body에 담긴 게시물 번호에 따라 DB에서 게시물 삭제
	db.collection('post').deleteOne(req.body, (err, result) => {
		console.log('삭제완료');
		res.status(200).send({ message: '성공했습니다.' });
	});
});

// /detail로 접속하면 detail.ejs 보여줌
app.get('/detail/:id', (req, res) => {
	db.collection('post').findOne({ _id: parseInt(req.params.id) }, (err, result) => {
		console.log(result);
		res.render('detail.ejs', { data: result });
	});
});

app.get('/edit/:id', (req, res) => {
	db.collection('post').findOne({ _id: parseInt(req.params.id) }, (err, result) => {
		if (result == null) {
			res.status(400).send({ message: '존재하지 않습니다.' });
		}
		console.log(result);
		res.render('edit.ejs', { post: result });
	});
});

app.put('/edit', (req, res) => {
	// 폼에 담긴 제목,날짜데이터를 가지고 db.collection에 업데이트
	db.collection('post').updateOne(
		{ _id: parseInt(req.body.id) },
		{ $set: { title: req.body.title, date: req.body.date } },
		(err, result) => {
			console.log('수정완료');
			res.redirect('/list');
		}
	); //updateOne(어떤게시물수정할지, 수정값, 콜백함수)
});

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({ secret: '비밀코드', resave: true, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// 로그인 페이지 제작 & 라우팅
app.get('/login', (req, res) => {
	res.render('login.ejs');
});

app.post(
	'/login',
	passport.authenticate('local', {
		failureRedirect: '/fail',
	}),
	(req, res) => {
		res.redirect('/');
	}
);

app.get('/mypage', loginChk, (req, res) => {
	res.render('mypage.ejs');
});

function loginChk(req, res, next) {
	if (req.user) {
		next();
	} else {
		res.send('로그인 안하셨는데요?');
	}
}

// passport.use(
// 	new LocalStrategy(
// 		{
// 			usernameField: 'id', //사용자가 제출한 아이디가 어디 적혔는지
// 			passwordField: 'pw', //사용자가 제출한 비번이 어디 적혔는지
// 			session: true, //세션을 만들건지
// 			passReqToCallback: false, //아이디/비번말고 다른 정보검사가 필요한지
// 		},
// 		function (inputId, inputPw, done) {
// 			console.log(inputId, inputPw);
// 			db.collection('login').findOne({ id: inputId }, function (err, result) {
// 				if (err) return done(err);

// 				if (!result) return done(null, false, { message: '존재하지않는 아이디요' });
// 				if (inputPw == result.pw) {
// 					return done(null, result);
// 				} else {
// 					return done(null, false, { message: '비번틀렸어요' });
// 				}
// 			});
// 		}
// 	)
// );
passport.use(
	new LocalStrategy(
		{
			usernameField: 'id', //사용자가 제출한 아이디가 어디 적혔는지
			passwordField: 'pw', //사용자가 제출한 비번이 어디 적혔는지
			session: true, //세션을 만들건지
			passReqToCallback: false, //아이디/비번말고 다른 정보검사가 필요한지
		},
		async (id, pw, done) => {
			try {
				const user = await db.collection('login').findOne({ id: id });
				// console.log(id, pw);
				// console.log(user.salt);
				// console.log(user.pw);

				if (!user) return done(null, false, { message: '존재하지않는 아이디요' });

				const verified = await verifyPassword(pw, user.salt, user.pw);
				if (!verified) {
					return done(null, false, {
						message: '비번틀렸어요',
					});
				}
				done(null, user); //serializeUser로 user 전달
			} catch {
				done(null, false, {
					message: '서버의 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
				});
			}
		}
	)
);

passport.serializeUser((user, done) => {
	//id를 이용해 세션을 저장시키는 코드 (로그인 성공시 발동)
	done(null, user.id);
});

passport.deserializeUser((id, done) => {
	//(마이페이지 접속시 발동)
	done(null, {});
});

// app.get('/fail', (req, res) => {
//     res.render('fail.ejs');
// })
