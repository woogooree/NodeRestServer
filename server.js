const express = require('express');
const session = require('express-session');
const mysql = require('mysql2');
const app = express();
const port = 80;
const bcrypt = require('bcrypt');

app.set('view engine', 'ejs');

// form submit 설정
app.use(express.urlencoded({ extended: true }));

// MySQL 연결 설정
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', // MySQL 사용자 이름
    password: '2379', // MySQL 비밀번호
    database: 'newschema' // 사용할 데이터베이스 이름
});


connection.connect((err) => {
    if (err) {
        console.error('MySQL 연결 실패:', err);
        return;
    }
    console.log('MySQL 연결 성공');
});

// 암호화
app.use(session({
    secret: 'your_secret_key',
    resave: false, 
    saveUninitialized: false, 
    cookie: { maxAge: 1200000 } 
  }));

app.get('/', (req, res) => {
    connection.query(`SELECT no, title, reg_user_id, user.nickname, DATE_FORMAT(reg_dt, '%Y-%m-%d %H:%i:%s') as regdt 
        FROM post JOIN user ON user.id = post.reg_user_id ORDER BY no DESC`, (err, posts) => {
    res.render('index', { posts , user: req.session.user});
    });

});


app.get('/join', (req, res) => {
    res.render('join', {});
});


// 회원 등록
app.post('/join', async (req, res) => {
    const newData = req.body;

    const hashedPassword = await bcrypt.hash(req.body.pw, 10);

    const sql = 'INSERT INTO `newschema`.`user` (`id`, `pw`,`nickname`, `email`, `level`) VALUES (?, ?, ?, ?, 1)';
    const values = [newData.id, hashedPassword, newData.nickname, newData.email];

    connection.query(sql, values, (err, result) => {
        if (err) {
            console.error('데이터베이스 오류:', err);
            return res.status(500).send('서버 오류');
        }
        const resultHtml = `<script>
        alert('회원 등록이 완료되었습니다.');
        location.href = '/';
    </script>`;
        res.send(resultHtml);
    });
});


//로그인 페이지
app.get('/login', (req, res) => {
    res.render('login');
})

// 로그인 세션 처리
app.post('/login', (req, res) => {
    //1. id에 해당하는 유저 정보를 db에서 꺼냄
    const sql = `SELECT * FROM user WHERE id = ?`;

    connection.query(sql, [req.body.id],(err, user) => {
        if(err) {
            console.error('데이터베이스 오류:', err);
            return res.status(403).send('서버 오류');
        }


        if(!user || user.length==0) {
            return res.status(403)
            .send(`<script>alert('사용자 정보를 찾을 수 없습니다.'); location.href='/login';</script>`);
        }

        user = user[0];

        //2. 로그인pw, 유저 정보의 hash되어 있는 pw 검증
        console.log(user);
        if (bcrypt.compareSync(req.body.pw, user.pw)){
            //3. 정보가 확인되면(인증 성공) 세션 발급
            req.session.user = user;
            res.redirect('/');
        } else {
            return res.status(403)
            .send(`<script>alert('사용자 정보를 찾을 수 없습니다.'); location.href='/login';</script>`);
        }

    })  
})

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

//글 작성
app.get('/form', (req, res) => {
    res.render('form');
})

//글 등록
app.post('/post', (req, res) => {
    const post = req.body;
   
    const sql = 'INSERT INTO `newschema`.`post` (`subject`, `title`, `content`, `reg_dt`, `reg_user_id`) VALUES (?, ?, ?, now(), ?)';
    const values = [post.subject, post.title, post.content, req.session.user.id];
    connection.query(sql, values, (err, result) => {
        
        const resultHtml = `<script>
        alert('게시글 등록이 완료되었습니다.');
        location.href = '/';
    </script>`;
        res.send(resultHtml);
    });
});

//글 삭제
app.post('/delete', (req, res)=>{
    const userid = req.session.user.id;
    connection.query(`DELETE FROM post WHERE no = ? AND reg_user_id = ?`, 
        [req.body.no, userid], (err, result)=>{
        res.redirect('/');
    })
})

// 글 상세조회
app.get('/posts/:no', (req, res) => {
    const no = req.params.no;
    connection.query(`SELECT * FROM post WHERE no = ?`, [no], (err, post) => {
        res.render('detail', {post: post[0]});
    })
});

app.listen(port, () => {
    console.log(`서버 실행중: http://localhost:${port}`);
})
