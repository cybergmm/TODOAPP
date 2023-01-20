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
const ObjectId = require('mongodb').ObjectID;

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
	console.log(salt);
	console.log(hashedPassword);
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

app.get('/list', (req, res) => {
	db.collection('post')
		.find()
		.toArray((err, result) => {
			console.log(result);
			res.render('list.ejs', { posts: result });
		});
	// db에 저장된 post라는 collection안의 데이터를 꺼내자
});
app.get('/search', (req, res) => {
	var search_requirement = [
		{
			$search: {
				index: 'titleSearch',
				text: {
					query: req.query.value,
					path: 'title', // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
				},
			},
		},
		// { $sort: { _id: 1 } },
		// { $limit: 10 },
		// { $project: { title: 1, _id: 0, score: { $meta: 'searchScore' } } },
	];
	console.log(req.query.value);
	db.collection('post')
		.aggregate(search_requirement)
		// .find({ $text: { $search: req.query.value } })
		.toArray((err, result) => {
			console.log(result);
			res.render('search.ejs', { posts: result, keyword: req.query.value });
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
	console.log(req.user);
	res.render('mypage.ejs', { user: req.user });
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

				const verified = await verifyPassword(pw, user.salt, user.pw); //비밀번호 검증(해쉬)
				if (!verified) {
					return done(null, false, {
						message: '비번틀렸어요',
					});
				} else {
					done(null, user); //serializeUser로 user 전달
				}
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

// deserializeUser 라는 부분은 고객의 세션아이디를 바탕으로 이 유저의 정보를 DB에서 찾아주세요~ 역할을 하는 함수입니다.
// 그리고 그 결과를 요청.user 부분에 꽂아줍니다.
passport.deserializeUser((id, done) => {
	db.collection('login').findOne({ id: id }, function (err, result) {
		done(null, result);
	});
});

app.get('/join', (req, res) => {
	res.render('join.ejs');
});

app.post('/join', async (req, res) => {
	//회원가입 로직
	const insertHashed = await createHashedPassword(req.body.pw);
	console.log(insertHashed);

	db.collection('login').findOne({ id: req.body.id }, (err, result) => {
		if (result !== null) {
			return res.send('아이디 중복입니다.'), console.log(result);
		}
		if (req.body.pw !== req.body.pw_chk) {
			return res.send('비밀번호가 일치하지 않습니다.');
		}

		db.collection('login').insertOne(
			{ id: req.body.id, pw: insertHashed.hashedPassword, salt: insertHashed.salt },
			(error, result) => {
				//DB.post에 새게시물을 추가함
				console.log('저장완료');
			}
		);

		res.redirect('/');
	});
});

app.post('/add', (req, res) => {
	//누군가 /add로 POST 요청
	console.log(req);

	db.collection('counter').findOne({ name: '게시물갯수' }, (err, result) => {
		//db.counter 내의 총개시물갯수를 찾음
		console.log(result.totalPost);
		var totalCount = result.totalPost;

		var insertData = { _id: totalCount + 1, title: req.body.title, date: req.body.date, writer: req.user._id };

		db.collection('post').insertOne(insertData, (error, result) => {
			//DB.post에 새게시물을 추가함
			console.log('저장완료');
			// counter라는 콜렉션에 있는 totalPost 라는 항목도 1 증가시켜야함 ->수정기능.
			db.collection('counter').updateOne({ name: '게시물갯수' }, { $inc: { totalPost: 1 } }, (err, result) => {
				//(어떤데이터를 수정할지,수정값)
				if (err) {
					return console.log(err);
				}
				res.send('전송완료');
			}); //완료되면 db.counter 내의 총게시물갯수 +1을 해줌
		});
	});

	// DB에 저장
});

app.delete('/delete', (req, res) => {
	console.log(req.body);
	req.body._id = parseInt(req.body._id);
	// req.body에 담긴 게시물 번호에 따라 DB에서 게시물 삭제

	var deleteData = { _id: req.body._id, writer: req.user._id };
	db.collection('post').deleteOne(deleteData, (err, result) => {
		console.log('삭제완료');
		if (result) {
			console.log(result);
		}
		res.status(200).send({ message: '성공했습니다.' });
	});
});

// app.get('/fail', (req, res) => {
//     res.render('fail.ejs');
// })

app.use('/shop', require('./routes/shop')); //라우트 나누기
app.use('/board/sub', require('./routes/board'));

// app.get('/shop/shirts', (req, res) => {
// 	res.send('셔츠 파는 페이지입니다.');
// });

// app.get('/shop/pants', (req, res) => {
// 	res.send('바지 파는 페이지입니다.');
// });

let multer = require('multer');
var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, './public/image');
	},
	filename: function (req, file, cb) {
		cb(null, file.originalname);
	},
	filefilter: function (req, file, cb) {},
});

var upload = multer({ storage: storage });

app.get('/upload', (req, res) => {
	res.render('upload.ejs');
});

app.post('/upload', upload.single('profile'), (req, res) => {
	res.send('업로드 완료');
});

app.get('/image/:imageName', (req, res) => {
	res.sendFile(__dirname + '/public/image/' + req.params.imageName);
});

app.post('/chatroom', (req, res) => {
	console.log(typeof req.user._id);
	console.log(typeof req.body.당한사람id);
	var date = new Date();
	var writer = ObjectId(req.body.당한사람id);
	var insertData = {
		member: [writer, req.user._id],
		title: '채팅방',
		date: date,
	};

	db.collection('chatroom').insertOne(insertData, (error, result) => {
		//DB.post에 새게시물을 추가함
		console.log('저장완료');
		// counter라는 콜렉션에 있는 totalPost 라는 항목도 1 증가시켜야함 ->수정기능.
	});
});

app.get('/chat', loginChk, (req, res) => {
	db.collection('chatroom')
		.find({ member: req.user._id })
		.toArray((err, result) => {
			console.log(result);
			res.render('chat.ejs', { data: result });
		});
	// res.render('chat.ejs', { user: req.user });
});

app.post('/message', loginChk, (req, res) => {
	var insertData = {
		parent: req.body.parent,
		content: req.body.content,
		userid: req.user._id,
		date: new Date(),
	};
	db.collection('message')
		.insertOne(insertData)
		.then(() => {
			console.log('DB저장성공');
			res.send('DB저장성공');
		});
});

app.get('/message/:id', loginChk, (req, res) => {
	res.writeHead(200, {
		Connection: 'keep-alive',
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
	});

	db.collection('message')
		.find({ parent: req.params.id })
		.toArray()
		.then((result) => {
			res.write('event: test\n');
			res.write('data: ' + JSON.stringify(result) + '\n\n');
		});

	const pipeline = [{ $match: { 'fullDocument.parent': req.params.id } }];
	const collection = db.collection('message');
	const changeStream = collection.watch(pipeline);
	changeStream.on('change', (result) => {
		// console.log(result.fullDocument);
		res.write('event: test\n');
		res.write('data: ' + JSON.stringify([result.fullDocument]) + '\n\n');
	});
});
