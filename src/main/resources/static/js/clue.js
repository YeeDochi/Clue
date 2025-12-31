/**
 * [ClueGame] Real Mode (22x22 Final Corrected Map)
 */
const ClueGame = (function() {

    // [1] 사용자 제공 맵 데이터 (22x22)
    // 텍스트 맵을 그대로 숫자로 변환함
    const MAP_DATA = [
        [0,0,0,0,0,0,1,1,1,3,0,0,0,1,1,1,1,0,0,0,0,0], // 0
        [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0], // 1
        [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,1,2,0,0,0,0], // 2 (주방, 무도회장, 온실)
        [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,1,1,0,0,0,3], // 3
        [0,0,0,0,2,0,1,1,2,0,0,0,0,0,2,1,1,1,1,1,1,1], // 4
        [3,1,1,1,1,1,1,1,0,2,0,0,0,2,0,1,1,1,1,1,1,1], // 5
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,2,0], // 6
        [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,2,0,0,0,0], // 7
        [0,0,0,0,0,0,0,0,1,1,2,0,0,0,2,1,1,0,0,0,0,0], // 8 (당구장 시작 Row)
        [0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0], // 9
        [0,0,0,0,0,0,0,2,1,1,0,0,0,0,0,1,1,0,0,0,0,0], // 10 (식당 문)
        [0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,1,1,1,1,1], // 11
        [0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,2,0,0], // 12
        [0,0,0,0,2,0,0,0,1,1,0,0,0,0,0,1,0,0,0,0,0,0], // 13
        [3,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,2,0,0,0,0,0], // 14 (도서관 문)
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0], // 15
        [1,1,1,1,1,1,1,1,1,0,0,2,2,0,0,1,1,0,0,0,0,0], // 16
        [0,0,0,0,0,0,2,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1], // 17
        [0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,1,1,1,1,3], // 18
        [0,0,0,0,0,0,0,1,1,0,0,0,0,0,2,1,0,2,0,0,0,0], // 19 (라운지, 홀, 공부방)
        [0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,0,0,0,0,0,0], // 20
        [0,0,0,0,0,0,0,1,3,0,0,0,0,0,0,1,0,0,0,0,0,0]  // 21
    ];

    // [2] 방 구역 매핑 (좌표 기반)
    function getRoomNameByCoord(x, y) {
        // [Top Area]
        if (y < 6) {
            if (x < 7) return "KITCHEN";       // 좌상: 주방
            if (x > 8 && x < 15) return "BALLROOM"; // 중상: 무도회장
            if (x > 16) return "CONSERVATORY"; // 우상: 온실
        }

        // [Middle Area]
        if (y >= 6 && y < 14) {
            if (x < 8) return "DINING";        // 좌중: 식당
            if (x > 16) return "BILLIARD";     // 우중: 당구장 (Row 8~)

            // 중앙 지하실 (Center)
            if (y > 7 && y < 13 && x > 9 && x < 14) return "CENTER";
        }

        // [Bottom Area]
        if (y >= 14) {
            if (y < 17 && x > 16) return "LIBRARY"; // 우중하: 도서관 (Row 14~)

            if (y > 17) {
                if (x < 7) return "LOUNGE";    // 좌하: 라운지
                if (x > 8 && x < 15) return "HALL"; // 중하: 홀
                if (x > 16) return "STUDY";    // 우하: 공부방
            }
        }
        return "HALL"; // Fallback
    }

    const CARD_META = {
        "MUSTARD": { name: "머스터드", icon: "💂" },
        "PLUM": { name: "플럼", icon: "🧐" },
        "GREEN": { name: "그린", icon: "👻" },
        "PEACOCK": { name: "피콕", icon: "🦚" },
        "SCARLET": { name: "스칼렛", icon: "💃" },
        "WHITE": { name: "화이트", icon: "👵" },

        "KNIFE": { name: "단검", icon: "🗡️" },
        "CANDLESTICK": { name: "촛대", icon: "🕯️" },
        "REVOLVER": { name: "권총", icon: "🔫" },
        "ROPE": { name: "밧줄", icon: "🪢" },
        "LEAD_PIPE": { name: "쇠파이프", icon: "➖" },
        "WRENCH": { name: "렌치", icon: "🔧" },

        // [수정된 방 이름 매핑]
        "KITCHEN": { name: "주방", icon: "🍳" },
        "BALLROOM": { name: "무도회장", icon: "💃" },
        "CONSERVATORY": { name: "온실", icon: "🌿" },
        "DINING": { name: "식당", icon: "🍽️" },
        "BILLIARD": { name: "당구장", icon: "🎱" },
        "LIBRARY": { name: "도서관", icon: "📚" },
        "LOUNGE": { name: "라운지", icon: "🛋️" },
        "HALL": { name: "홀", icon: "🏛️" },
        "STUDY": { name: "공부방", icon: "📝" },
        "CENTER": { name: "최종추리", icon: "⚖️" },

        "Start_Hall": { name: "대기실", icon: "🏁" }
    };

    const ROOM_KEYS = ["KITCHEN", "BALLROOM", "CONSERVATORY", "DINING", "BILLIARD", "LIBRARY", "LOUNGE", "HALL", "STUDY"];
    const SUSPECT_KEYS = ["MUSTARD", "PLUM", "GREEN", "PEACOCK", "SCARLET", "WHITE"];
    const WEAPON_KEYS = ["KNIFE", "CANDLESTICK", "REVOLVER", "ROPE", "LEAD_PIPE", "WRENCH"];

    let myHand=[], isMyTurn=false, myLocation="Start_Hall", players={}, currentPhase="", movesLeft=0, currentActionType="";

    function onEnterRoom() {
        console.log("Clue 22x22 Corrected Map");
        renderBoard22x22();
        printLog("대기실에 입장했습니다.");
    }

    function printLog(html) {
        const box = document.getElementById('game-logs');
        if(box){const d=document.createElement('div');d.className='log-item';d.innerHTML=html;box.appendChild(d);box.scrollTop=box.scrollHeight;}
    }

    function handleMessage(msg, myId) {
        if (msg.type==='GAME_STARTED') {
            Core.showAlert("게임 시작!<br>주사위를 굴려 이동하세요.");
            document.getElementById('startBtn').classList.add('hidden');
            updateGameState(msg.data, myId);
        }
        else if (msg.type==='DICE_ROLLED') {
            printLog(`🎲 <b>${msg.sender}</b>: 주사위 <b>${msg.data.dice}</b>`);
            if(msg.data.playerId===myId) { movesLeft=msg.data.dice; updateDiceUI(movesLeft); }
        }
        else if (msg.type==='MOVED') {
            if(msg.data.playerId===myId) { myLocation=msg.data.location; movesLeft=msg.data.movesLeft; updateDiceUI(movesLeft); }
        }
        else if (msg.type==='NEXT_TURN') updateGameState(msg.data, myId);
        else if (msg.type==='SUGGESTION_MADE') {
            const d=msg.data;
            printLog(`🧐 <b>${players[msg.senderId]||msg.sender}</b> 추리: ${getKorName(d.suspect)}/${getKorName(d.weapon)}/${getKorName(d.room)}`);
            if (d.status==='WAITING_RESPONSE') {
                if (d.refuterId===myId) openRefuteModal(d);
                else printLog(`👉 <b>${players[d.refuterId]||d.refuter}</b> 반박 중...`);
            } else if (d.status==='NO_ONE_REFUTED') printLog("❌ 반박 실패!");
        }
        else if (msg.type==='SUGGESTION_RESULT') {
            const d=msg.data;
            if(d.success) {
                printLog(`💡 <b>${players[d.refuterId]||d.refuter}</b> 반박 성공.`);
                if(d.shownCard) Core.showAlert(`[증거]<br><span style="font-size:24px">${getMeta(d.shownCard.name).icon}</span> ${getKorName(d.shownCard.name)}`);
            }
        }
        else if (msg.type==='GAME_OVER') {
            let ans = msg.data.answer ? msg.data.answer.map(c=>getKorName(c.name)).join(", ") : "";
            Core.showAlert(`🏆 승리: ${msg.data.winner}<br>정답: ${ans}`);
            setTimeout(()=>location.reload(), 5000);
        }
        if(msg.data) updateGameState(msg.data, myId);
    }

    function updateGameState(data, myId) {
        if(!data) return;
        if(data.users) { players={}; for(let u in data.users) players[u]=data.users[u].nickname; }

        isMyTurn = (data.currentTurn === myId);
        currentPhase = data.currentPhase || "ROLL";
        movesLeft = data.movesLeft || 0;

        document.getElementById('game-status').innerText = `${players[data.currentTurn]||"?"} (${currentPhase})`;
        const badge = document.getElementById('my-turn-badge');

        if(isMyTurn) {
            badge.style.display='inline-block';
            updateButtons();
            updateDiceUI(movesLeft);
        } else {
            badge.style.display='none';
            disableAllButtons();
        }
        if(data.playerLocations) refreshTokens(data.playerLocations);
        if(data.users && data.users[myId]) renderHand(data.users[myId].attributes.hand);
    }

    function updateButtons() {
        disableAllButtons();
        const r=document.getElementById('btn-roll'), s=document.getElementById('btn-suggest'), a=document.getElementById('btn-accuse'), e=document.getElementById('btn-endturn');

        if (currentPhase === 'ROLL') {
            r.disabled = false;
        }
        else if (currentPhase === 'ACTION') {
            if (myLocation === "Room:CENTER") {
                // 중앙: 고발만 가능
                a.disabled = false;
                e.disabled = false;
                s.disabled = true;
                document.getElementById('dice-display').innerText = "⚖️ 최종 고발만 가능!";
            } else if (myLocation.startsWith("Room:")) {
                s.disabled = false;
                a.disabled = false;
                e.disabled = false;
            } else {
                e.disabled = false;
            }
        }
        else if (currentPhase === 'END') {
            e.disabled = false;
        }
    }

    function disableAllButtons() { ['btn-roll','btn-suggest','btn-accuse','btn-endturn'].forEach(id=>document.getElementById(id).disabled=true); }
    function updateDiceUI(v) { document.getElementById('dice-display').innerText=`🎲 이동: ${v}`; }

    // [문 방향 자동 감지]
    function getDoorRotation(x, y) {
        const isWalkable = (v) => (v === 1 || v === 3);
        const H = MAP_DATA.length;
        const W = MAP_DATA[0].length;

        if (y > 0 && isWalkable(MAP_DATA[y-1][x])) return 0;
        if (y < H-1 && isWalkable(MAP_DATA[y+1][x])) return 180;
        if (x > 0 && isWalkable(MAP_DATA[y][x-1])) return 270;
        if (x < W-1 && isWalkable(MAP_DATA[y][x+1])) return 90;
        return 0;
    }

    // --- Rendering ---
    function renderBoard22x22() {
        const grid = document.getElementById('board-grid');
        grid.innerHTML = '';

        for(let y=0; y<22; y++) {
            const rowData = MAP_DATA[y];
            for(let x=0; x<22; x++) {
                const type = rowData[x];
                const cell = document.createElement('div');
                cell.className = 'tile';
                cell.id = `tile-${x}-${y}`;
                cell.dataset.x = x; cell.dataset.y = y;

                if(type === 0) {
                    cell.classList.add('wall');
                    if(getRoomNameByCoord(x, y)) cell.classList.add('room-area');
                }
                else if(type === 1) {
                    cell.onclick = () => handleTileClick(x, y);
                }
                else if(type === 2) {
                    cell.classList.add('door');
                    const rot = getDoorRotation(x, y);
                    cell.innerHTML = `<div style="transform: rotate(${rot}deg); font-size:16px; display:flex; flex-direction:column; align-items:center;">
                        <i class="fas fa-door-open" style="color:#5a3a22;"></i>
                        <i class="fas fa-caret-up" style="color:#d73a49; margin-top:-6px;"></i>
                    </div>`;
                    cell.onclick = () => handleTileClick(x, y, true);
                }
                else if(type === 3) {
                    cell.classList.add('start-pos');
                    cell.onclick = () => handleTileClick(x, y);
                }
                grid.appendChild(cell);
            }
        }

        // 라벨 (보내주신 위치대로 정확하게)
        addLabel(2, 2, "주방");
        addLabel(11, 2, "무도회장");
        addLabel(19, 2, "온실");

        addLabel(2, 10, "식당");
        addLabel(19, 8, "당구장");

        addLabel(11, 10, "최종추리");

        addLabel(19, 14, "도서관");
        addLabel(2, 19, "라운지");
        addLabel(11, 20, "홀");
        addLabel(19, 20, "공부방");
    }

    function addLabel(x, y, txt) {
        const t = document.getElementById(`tile-${x}-${y}`);
        if(t) t.innerHTML += `<div class="room-label-overlay" style="font-size:11px;">${txt}</div>`;
    }

    function refreshTokens(locs) {
        document.querySelectorAll('.token').forEach(e=>e.remove());
        for(const [pid, loc] of Object.entries(locs)) {
            let tid = "";
            if(loc === "Start_Hall") tid = "tile-11-10";
            else if(loc.startsWith("Room:")) {
                const r = loc.split(":")[1];
                if(r==="KITCHEN") tid="tile-2-2";
                else if(r==="BALLROOM") tid="tile-11-2";
                else if(r==="CONSERVATORY") tid="tile-19-2";
                else if(r==="DINING") tid="tile-2-10";
                else if(r==="BILLIARD") tid="tile-19-8";
                else if(r==="CENTER") tid="tile-11-10";
                else if(r==="LIBRARY") tid="tile-19-14";
                else if(r==="LOUNGE") tid="tile-2-19";
                else if(r==="HALL") tid="tile-11-20";
                else if(r==="STUDY") tid="tile-19-20";
                else tid="tile-11-10";
            } else {
                const [lx, ly] = loc.split("-");
                tid = `tile-${lx}-${ly}`;
            }
            const t = document.getElementById(tid);
            if(t) {
                const d = document.createElement('div'); d.className='token';
                d.innerText = (players[pid]||"?")[0];
                d.style.background = stringToColor(players[pid]||"?");
                const cnt = t.querySelectorAll('.token').length;
                if(cnt>0) d.style.transform = `translate(${cnt*3}px, ${cnt*3}px)`;
                t.appendChild(d);
            }
        }
    }

    function handleTileClick(x, y, isDoor) {
        if(!isMyTurn || currentPhase!=='MOVE') return;
        if(movesLeft<=0) { alert("이동력 부족"); return; }

        let cx=-1, cy=-1;
        if(myLocation==="Start_Hall") { cx=11; cy=10; }
        else if(myLocation.includes("-")) { const p=myLocation.split("-"); cx=parseInt(p[0]); cy=parseInt(p[1]); }
        else { alert("방에서는 행동을 선택하거나 턴을 종료하세요."); return; }

        if (Math.abs(cx-x) + Math.abs(cy-y) !== 1) { alert("인접한 칸으로만 이동 가능"); return; }

        let target = `${x}-${y}`;
        if(isDoor) {
            const rName = getRoomNameByCoord(x, y) || "HALL";
            target = `Room:${rName}`;
        }
        Core.sendAction({ actionType:'MOVE', location:target });
    }

    // --- Helpers ---
    function renderHand(cards) {
        const c=document.getElementById('my-hand-area'); c.innerHTML='';
        if(cards) cards.forEach(cd => {
            const m = getMeta(cd.name);
            const e = document.createElement('div'); e.className=`clue-card ${cd.type.toLowerCase()}`;
            e.innerHTML=`<div class="card-type">${cd.type}</div><div class="card-icon">${m.icon}</div><div class="card-name">${m.name}</div>`;
            c.appendChild(e);
        });
    }
    function rollDice(){ Core.sendAction({actionType:'ROLL_DICE'}); }
    function startGame(){ Core.sendAction({actionType:'START'}); }
    function endTurn(){ Core.sendAction({actionType:'TURN_END'}); }

    function openActionModal(t){
        currentActionType=t;
        document.getElementById('action-modal').classList.remove('hidden');
        fillSelect('sel-suspect',SUSPECT_KEYS); fillSelect('sel-weapon',WEAPON_KEYS);

        const roomSelect = document.getElementById('sel-room');
        roomSelect.innerHTML = '';

        if (t === 'ACCUSE') {
            ROOM_KEYS.forEach(k => {
                const op = document.createElement('option');
                op.value = k; op.innerText = getKorName(k);
                roomSelect.appendChild(op);
            });
            roomSelect.disabled = false;
        } else {
            ROOM_KEYS.forEach(k => {
                const op = document.createElement('option');
                op.value = k; op.innerText = getKorName(k);
                roomSelect.appendChild(op);
            });
            if(myLocation.startsWith("Room:")) {
                const cur = myLocation.split(":")[1];
                roomSelect.value = cur;
                roomSelect.disabled = true;
            }
        }
    }
    function submitAction(){
        const s=document.getElementById('sel-suspect').value, w=document.getElementById('sel-weapon').value, r=document.getElementById('sel-room').value;
        Core.sendAction({actionType:currentActionType, suspect:s, weapon:w, room:r});
        document.getElementById('action-modal').classList.add('hidden');
    }
    function openRefuteModal(d){
        document.getElementById('refute-modal').classList.remove('hidden');
        document.getElementById('refute-msg').innerText = `${getKorName(d.suspect)} / ${getKorName(d.weapon)} / ${getKorName(d.room)}`;
        const l=document.getElementById('refute-card-list'); l.innerHTML='';
        const m=myHand.filter(c=>c.name===d.suspect||c.name===d.weapon||c.name===d.room);
        if(m.length===0) {
            const b=document.createElement('button'); b.className='btn-default'; b.innerText='없음';
            b.onclick=()=>{Core.sendAction({actionType:'RESPONSE',card:null});document.getElementById('refute-modal').classList.add('hidden');};
            l.appendChild(b);
        } else {
            m.forEach(c=>{
                const e=document.createElement('div'); e.className=`clue-card ${c.type.toLowerCase()}`;
                e.innerHTML=`<div class="card-name">${getKorName(c.name)}</div>`;
                e.onclick=()=>{Core.sendAction({actionType:'RESPONSE',card:c});document.getElementById('refute-modal').classList.add('hidden');};
                l.appendChild(e);
            });
        }
    }
    function fillSelect(id,k){ const s=document.getElementById(id); s.innerHTML=''; k.forEach(v=>{const o=document.createElement('option');o.value=v;o.innerText=getKorName(v);s.appendChild(o);}); }
    function getKorName(k){ return CARD_META[k]?CARD_META[k].name:k; }
    function getMeta(k){ return CARD_META[k]||{name:k,icon:'?',color:'#eee'}; }
    function stringToColor(s){ let h=0;for(let i=0;i<s.length;i++)h=s.charCodeAt(i)+((h<<5)-h);let c='#';for(let i=0;i<3;i++)c+=('00'+((h>>(i*8))&0xFF).toString(16)).substr(-2);return c; }

    return { onEnterRoom, handleMessage, startGame, rollDice, endTurn, openSuggestModal:()=>openActionModal('SUGGEST'), openAccuseModal:()=>openActionModal('ACCUSE'), submitAction };
})();
Core.init(ClueGame, { apiPath:'/Clue', wsPath:'/Clue/ws', gameName:'Clue' });