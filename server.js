const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }))
var db;
const MongoClient = require('mongodb').MongoClient;
app.set('view engine', 'ejs');

MongoClient.connect('mongodb+srv://admin:qC7Mnf6qNA6quWlj@cluster0.2afz5ax.mongodb.net/?retryWrites=true&w=majority', (error, client) => {
// 연결되면 할일
    if (error) {
        return console.log(error);
    }

    db = client.db('todoapp');

    // db.collection('post').insertOne({name: 'sumin', age:29}, (error, result) => {
    //     console.log('저장완료');
    // });

    app.listen(8080, ()=> {
    console.log('listening on 8080');
    });

})



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
    res.send('전송완료');
    console.log(req.body.title);
    console.log(req.body.date);
    db.collection('post').insertOne({ title: req.body.title, date:req.body.date}, (error, result) => {
        console.log('저장완료');
    });
    // DB에 저장 
})

app.get('/list', (req, res) => {
    
    db.collection('post').find().toArray((err, result) => {
        console.log(result);
        res.render('list.ejs', { posts: result });
    });
    

    // db에 저장된 post라는 collection안의 데이터를 꺼내자
    
});
