var router = require('express').Router();

function loginChk(req, res, next) {
	if (req.user) {
		next();
	} else {
		res.send('로그인 안하셨는데요?');
	}
}

router.use(loginChk); //해당 라우트 전역
// router.use('/shirts',loginChk); //원하는 라우트 부분에만 미들웨어 적용 가능

router.get('/shirts', (req, res) => {
	res.send('셔츠 파는 페이지입니다.');
});

router.get('/pants', (req, res) => {
	res.send('바지 파는 페이지입니다.');
});

module.exports = router;
