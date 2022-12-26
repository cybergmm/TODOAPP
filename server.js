const express = require('express');
const app = express();

app.listen(8080, function() {
    console.log('listening on 8080');
});

app.get('/', function (req, res) {
    res.sendFile(__dirname+'/index.html');
});

app.get('/write', function (req, res) {
    res.sendFile(__dirname + '/write.html');
});

app.get('/pet',function(req, res) {
    res.send('펫용품 쇼핑할 수 있는 사이트입니다.')
});
// 누군가가 /pet으로 방문하면 .. pet 관련된 안내문을 띄워주자

app.get('/beauty', function (req, res) {
    res.send('뷰티 상품을 쇼핑할 수 있는 사이트입니다.')
});

app.post('/add', (req, res) => {
    res.send('전송완료')
})