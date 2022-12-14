const { WebSocket } = require('ws');
const data = require('./data');

function socket (server)
{
    const wss = new WebSocket.Server({ server });
    
    wss.on('connection', ws => 
    {
        let userid = undefined;

        function receiveSession (resp)
        {
            console.log(resp);
            const session = data.sessions[resp.id];
            if(!session) 
            {
                ws.close(1002, "A sessão não é mais válida");//
                return;
            }

            userid = session.userid;
            console.log(`Client connected with id:${userid}.`);

            const initialSetup = {
                type: "setup",
                data: userid
            };
            ws.send(JSON.stringify(initialSetup));

            const user = data.users[userid];
            if(!user) return;

            data.connect(userid, ws);
        };

        function receiveMessage (msg)
        {
            const user = data.users[userid];
            if(!user) return;
            if(msg["id"]) delete msg["id"];
            msg.id = userid;
            msg.username = user.name;

            console.log(msg);
            if(!msg.private)
            {
                //data.addMsg(msg);
                data.broadcast(msg);
            }
            else
            {
                msg.type = "private";
                data.sendTo(msg.private, msg);
                data.sendTo(msg.id, msg);
            }
            
        };

        const events = {
            "message": receiveMessage,
            "audio": receiveMessage,
            "session": receiveSession
        }

        ws.on('message', resp => 
        {
            try {
                const msg = JSON.parse(resp.toString());
                const event = events[msg.type];
                if(event) event(msg);
            }
            catch (e)
            {
                console.log(e);
            }
        });

        ws.on('close', () => 
        {
            data.disconnect(userid);
            console.log(`Client disconnected with id:${userid}.`);
        });
    });
}

module.exports = socket;