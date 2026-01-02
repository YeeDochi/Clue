/**
 * [ClueGame] Final Fix: My Location Sync
 */
const ClueGame = (function() {

    // [1] 맵 데이터 (22x22)
    const MAP_DATA = [
        [0,0,0,0,0,0,1,1,1,3,0,0,0,1,1,1,1,0,0,0,0,0],
        [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0],
        [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,1,2,0,0,0,0],
        [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,1,1,0,0,0,3],
        [0,0,0,0,2,0,1,1,2,0,0,0,0,0,2,1,1,1,1,1,1,1],
        [3,1,1,1,1,1,1,1,0,2,0,0,0,2,0,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,2,0],
        [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,2,0,0,0,0],
        [0,0,0,0,0,0,0,0,1,1,2,0,0,0,2,1,1,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0],
        [0,0,0,0,0,0,0,2,1,1,0,0,0,0,0,1,1,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,1,1,1,1,1],
        [0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,2,0,0],
        [0,0,0,0,2,0,0,0,1,1,0,0,0,0,0,1,0,0,0,0,0,0],
        [3,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,2,0,0,0,0,0],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0],
        [1,1,1,1,1,1,1,1,1,0,0,2,2,0,0,1,1,0,0,0,0,0],
        [0,0,0,0,0,0,2,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1],
        [0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,1,1,1,1,3],
        [0,0,0,0,0,0,0,1,1,0,0,0,0,0,2,1,0,2,0,0,0,0],
        [0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,1,3,0,0,0,0,0,0,1,0,0,0,0,0,0]
    ];

    // [2] 문 좌표-방 이름 매핑 (정밀 수정)
    const DOOR_MAP = {
        "17,2": "CONSERVATORY",
        "4,4": "KITCHEN", "8,4": "BALLROOM", "14,4": "BALLROOM",
        "9,5": "BALLROOM", "13,5": "BALLROOM",
        "20,6": "BILLIARD", "17,7": "BILLIARD", "19,12": "BILLIARD",
        "10,8": "CENTER", "14,8": "CENTER",
        "7,10": "DINING", "4,13": "DINING",
        "16,14": "LIBRARY",
        "11,16": "HALL", "12,16": "HALL",
        "6,17": "LOUNGE",
        "14,19": "HALL", "17,19": "STUDY"
    };

    // [3] 좌표 기반 방 이름 찾기 (DOOR_MAP 우선순위 강화)
    function getRoomNameByCoord(x, y) {
        const doorKey = `${x},${y}`;
        if (DOOR_MAP[doorKey]) return DOOR_MAP[doorKey];

        if (y < 6 && x < 6) return "KITCHEN";
        if (y < 6 && x > 8 && x < 15) return "BALLROOM";
        if (y < 6 && x > 16) return "CONSERVATORY";
        if (y >= 6 && y < 14) {
            if (x < 8) return "DINING";
            if (x > 16) return "BILLIARD";
            if (y > 7 && y < 13 && x > 9 && x < 14) return "CENTER";
        }
        if (y >= 14) {
            if (y < 17 && x > 16) return "LIBRARY";
            if (y >= 17) {
                if (x < 7) return "LOUNGE";
                if (x > 8 && x < 15) return "HALL";
                if (x > 16) return "STUDY";
            }
        }
        return "HALL";
    }

    // [4] 문 방향 계산 (당구장 위쪽 문 예외 처리)
    function getDoorRotation(x, y) {
        // 당구장 위쪽 문(20, 6)은 무조건 위쪽(0도)이 복도라고 강제 지정
        if (x === 20 && y === 6) return 0;

        const isWalkable = (v) => (v === 1 || v === 3);
        if (y > 0 && isWalkable(MAP_DATA[y-1][x])) return 0;
        if (y < 21 && isWalkable(MAP_DATA[y+1][x])) return 180;
        if (x > 0 && isWalkable(MAP_DATA[y][x-1])) return 270;
        if (x < 21 && isWalkable(MAP_DATA[y][x+1])) return 90;
        return 0;
    }

    const CARD_META = {
        "MUSTARD": { name: "머스터드", icon: "💂", color: "#FFD700" },
        "PLUM": { name: "플럼", icon: "🧐", color: "#800080" },
        "GREEN": { name: "그린", icon: "👻", color: "#008000" },
        "PEACOCK": { name: "피콕", icon: "🦚", color: "#0000FF" },
        "SCARLET": { name: "스칼렛", icon: "💃", color: "#FF0000" },
        "WHITE": { name: "화이트", icon: "👵", color: "#FFFFFF" },
        "KNIFE": { name: "단검", icon: "🗡️" }, "CANDLESTICK": { name: "촛대", icon: "🕯️" },
        "REVOLVER": { name: "권총", icon: "🔫" }, "ROPE": { name: "밧줄", icon: "🪢" },
        "LEAD_PIPE": { name: "쇠파이프", icon: "➖" }, "WRENCH": { name: "렌치", icon: "🔧" },
        "KITCHEN": { name: "주방", icon: "🍳" }, "BALLROOM": { name: "무도회장", icon: "💃" },
        "CONSERVATORY": { name: "온실", icon: "🌿" }, "DINING": { name: "식당", icon: "🍽️" },
        "BILLIARD": { name: "당구장", icon: "🎱" }, "LIBRARY": { name: "도서관", icon: "📚" },
        "LOUNGE": { name: "라운지", icon: "🛋️" }, "HALL": { name: "홀", icon: "🏛️" },
        "STUDY": { name: "공부방", icon: "📝" }, "CENTER": { name: "최종추리", icon: "⚖️" },
        "Start_Hall": { name: "대기실", icon: "🏁" }
    };

    const ROOM_KEYS = ["KITCHEN", "BALLROOM", "CONSERVATORY", "DINING", "BILLIARD", "LIBRARY", "LOUNGE", "HALL", "STUDY"];
    const SUSPECT_KEYS = ["MUSTARD", "PLUM", "GREEN", "PEACOCK", "SCARLET", "WHITE"];
    const WEAPON_KEYS = ["KNIFE", "CANDLESTICK", "REVOLVER", "ROPE", "LEAD_PIPE", "WRENCH"];

    let myHand=[], isMyTurn=false, myLocation="Start_Hall", players={}, playerChars={};
    let currentPhase="", movesLeft=0;

    function onEnterRoom() {
        console.log("Entering Room...");
        renderBoard22x22();
        printLog("대기실에 입장했습니다.");
    }

    function printLog(html) {
        const box = document.getElementById('game-logs');
        if(box){const d=document.createElement('div');d.className='log-item';d.innerHTML=html;box.appendChild(d);box.scrollTop=box.scrollHeight;}
    }

    function handleMessage(msg, myId) {
        try {
            if (msg.type === 'ERROR') {
                Core.showAlert(`⛔ 오류: ${msg.content}`);
                return;
            }
            if (msg.type === 'GAME_STARTED') {
                Core.showAlert("게임이 시작되었습니다!");
                document.getElementById('startBtn').classList.add('hidden');
                if(msg.data) msg.data.playing = true;
                updateGameState(msg.data, myId);
            }
            else if (msg.type === 'DICE_ROLLED') {
                printLog(`🎲 <b>${msg.sender}</b>: 주사위 <b>${msg.data.dice}</b>`);
                if(msg.data.playerId === myId) {
                    movesLeft = msg.data.dice;
                    updateDiceUI(movesLeft);
                }
            }
            else if (msg.type === 'MOVED') {
                if(msg.data.playerId === myId) {
                    myLocation = msg.data.location;
                    movesLeft = msg.data.movesLeft;
                    updateDiceUI(movesLeft);
                }
            }
            if (msg.data) updateGameState(msg.data, myId);
        } catch (e) { console.error("handleMessage Error:", e); }
    }
    function isValidDoorEntry(curX, curY, doorX, doorY) {
        const rot = getDoorRotation(doorX, doorY);
        // rot: 0(위가 복도=위에서 들어옴), 180(아래가 복도), 270(왼쪽), 90(오른쪽)
        if (rot === 0) return curY === doorY - 1 && curX === doorX;
        if (rot === 180) return curY === doorY + 1 && curX === doorX;
        if (rot === 270) return curX === doorX - 1 && curY === doorY;
        if (rot === 90) return curX === doorX + 1 && curY === doorY;
        return false;
    }

    function updateGameState(data, myId) {
        if (!data) return;
        try {
            if(data.users) { players={}; for(let u in data.users) players[u]=data.users[u].nickname; }
            if(data.playerCharacters) playerChars = data.playerCharacters;

            const isReallyPlaying = data.playing || (data.currentTurn !== null);
            if (!isReallyPlaying) {
                document.getElementById('game-status').innerText = "⏳ 대기 중 (시작 필요)";
                document.getElementById('startBtn').classList.remove('hidden');
                document.getElementById('my-turn-badge').style.display = 'none';
                return;
            }

            const grid = document.getElementById('board-grid');
            if (grid.children.length === 0) renderBoard22x22();

            isMyTurn = (data.currentTurn === myId);
            currentPhase = data.currentPhase || "ROLL";
            movesLeft = data.movesLeft || 0;

            const myCharKey = playerChars[myId];
            const myCharName = myCharKey ? getKorName(myCharKey) : "관전자";
            document.getElementById('welcome-msg').innerText = ` 역할: ${myCharName}`;

            const turnNick = players[data.currentTurn] || "누군가";
            document.getElementById('game-status').innerText = `${turnNick}의 턴 (${getPhaseName(currentPhase)})`;

            const badge = document.getElementById('my-turn-badge');
            if(isMyTurn) {
                badge.style.display='inline-block';
                updateButtons();
                updateDiceUI(movesLeft);
            } else {
                badge.style.display='none';
                disableAllButtons();
            }

            if(data.playerLocations) {
                refreshTokens(data.playerLocations);
                // [핵심 수정] 내 위치 동기화 (이게 없어서 시작 위치 인식 실패했음)
                if(data.playerLocations[myId]) {
                    myLocation = data.playerLocations[myId];
                }
            }
            if(data.users && data.users[myId]) renderHand(data.users[myId].attributes.hand);
        } catch (e) { console.error("updateGameState Error:", e); }
    }

    function getPhaseName(p) {
        if(p==='ROLL') return "주사위";
        if(p==='MOVE') return "이동";
        if(p==='ACTION') return "행동";
        return "";
    }

    function updateButtons() {
        const r = document.getElementById('btn-roll');
        const s = document.getElementById('btn-suggest');
        const a = document.getElementById('btn-accuse');
        const e = document.getElementById('btn-endturn');

        // 일단 모든 버튼 비활성화
        [r, s, a, e].forEach(btn => { if (btn) btn.disabled = true; });

        if (currentPhase === 'ROLL') {
            if (r) r.disabled = false;
        }
        // 이동 중(MOVE), 행동 중(ACTION), 이동 종료(END) 단계 모두에서 턴 종료 가능하게 설정
        else if (currentPhase === 'MOVE' || currentPhase === 'ACTION' || currentPhase === 'END') {
            if (e) e.disabled = false;
        }

        if (currentPhase === 'ACTION') {
            // 방 안이고 최종추리실이 아닐 때만 추리 가능
            if (s && myLocation.startsWith("Room:") && myLocation !== "Room:CENTER") s.disabled = false;
            if (a) a.disabled = false;
        }
    }

    function disableAllButtons() { ['btn-roll','btn-suggest','btn-accuse','btn-endturn'].forEach(id=>document.getElementById(id).disabled=true); }
    function updateDiceUI(v) { document.getElementById('dice-display').innerText=`🎲 남은이동: ${v}`; }

    // 이동 처리
    function handleTileClick(x, y, isDoor) {
        if (!isMyTurn || currentPhase !== 'MOVE') return;
        if (movesLeft <= 0) { alert("이동력 부족! 턴을 넘기세요."); return; }

        let isValidMove = false;
        let [cx, cy] = [-1, -1];

        // 현재 위치 좌표 파싱
        if (myLocation.includes("-")) {
            [cx, cy] = myLocation.split("-").map(Number);
        }

        // 1. 방 안에 있을 때 (탈출 로직)
        if (myLocation.startsWith("Room:")) {
            const currentRoomName = myLocation.split(":")[1];
            if (!currentRoomName) { alert("현재 방 정보를 알 수 없습니다."); return; }

            // 현재 방에 연결된 모든 문 좌표 확인
            for (let key in DOOR_MAP) {
                if (DOOR_MAP[key] === currentRoomName) {
                    const [dx, dy] = key.split(',').map(Number);
                    // 문 정면 칸을 클릭했는지 체크 (isValidDoorEntry 로직 활용)
                    if (isValidDoorEntry(x, y, dx, dy)) {
                        isValidMove = true;
                        break;
                    }
                }
            }
            if (!isValidMove) {
                alert(`[${getKorName(currentRoomName)}]에서 나가려면 문의 정면에 있는 복도 칸을 클릭하세요.`);
                return;
            }
        }
        // 2. 복도에 있을 때 (이동 및 진입 로직)
        else if (cx !== -1 && cy !== -1) {
            if (isDoor) {
                // 문 진입 시 정면 체크
                if (isValidDoorEntry(cx, cy, x, y)) {
                    isValidMove = true;
                } else {
                    alert("문의 정면(화살표 방향)에서만 진입할 수 있습니다.");
                    return;
                }
            } else {
                // 일반 복도 간 이동 (인접 1칸)
                if (Math.abs(cx - x) + Math.abs(cy - y) === 1) {
                    isValidMove = true;
                } else {
                    alert("인접한 칸(상하좌우)으로만 이동 가능합니다.");
                    return;
                }
            }
        } else {
            alert("위치 정보 동기화 중... 다시 시도해주세요.");
            return;
        }

        // 검증 통과 시 서버에 액션 전송
        let target = `${x}-${y}`;
        if (isDoor) {
            const rName = getRoomNameByCoord(x, y) || "HALL";
            target = `Room:${rName}`;
        }
        Core.sendAction({ actionType: 'MOVE', location: target });
    }

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
                } else if(type === 1) {
                    cell.onclick = () => handleTileClick(x, y);
                } else if(type === 2) {
                    cell.classList.add('door');
                    const rot = getDoorRotation(x, y);
                    cell.innerHTML = `<div style="transform: rotate(${rot}deg); font-size:16px; display:flex; flex-direction:column; align-items:center;">
                        <i class="fas fa-door-open" style="color:#5a3a22;"></i>
                        <i class="fas fa-caret-up" style="color:#d73a49; margin-top:-6px;"></i>
                    </div>`;
                    cell.onclick = () => handleTileClick(x, y, true);
                } else if(type === 3) {
                    cell.classList.add('start-pos');
                    cell.onclick = () => handleTileClick(x, y);
                }
                grid.appendChild(cell);
            }
        }
        addLabel(2, 2, "주방"); addLabel(11, 2, "무도회장"); addLabel(19, 2, "온실");
        addLabel(2, 10, "식당"); addLabel(19, 8, "당구장"); addLabel(11, 10, "최종추리");
        addLabel(19, 14, "도서관"); addLabel(2, 19, "라운지"); addLabel(11, 20, "홀"); addLabel(19, 20, "공부방");
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
                const pName = players[pid] || "?";
                const charKey = playerChars[pid];
                let bgColor = "#555"; let charIcon = "";
                if (charKey && CARD_META[charKey]) {
                    bgColor = CARD_META[charKey].color;
                    charIcon = CARD_META[charKey].icon;
                } else {
                    bgColor = stringToColor(pName);
                }
                const d = document.createElement('div'); d.className='token';
                d.innerText = charIcon || pName.charAt(0);
                d.style.backgroundColor = bgColor;
                d.title = `${pName} (${charKey ? getKorName(charKey) : "Unknown"})`;
                const cnt = t.querySelectorAll('.token').length;
                if(cnt>0) d.style.transform = `translate(${cnt*3}px, ${cnt*3}px)`;
                t.appendChild(d);
            }
        }
    }

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
    function endTurn() {
        if (!isMyTurn) return;
        if (currentPhase === 'MOVE' && movesLeft > 0) {
            if (!confirm("이동력이 남았습니다. 턴을 종료할까요?")) return;
        }
        Core.sendAction({ actionType: 'TURN_END' });
    }
    function openActionModal(t){
        currentActionType=t;
        document.getElementById('action-modal').classList.remove('hidden');
        fillSelect('sel-suspect',SUSPECT_KEYS); fillSelect('sel-weapon',WEAPON_KEYS);
        const roomSelect = document.getElementById('sel-room'); roomSelect.innerHTML = '';
        if (t === 'ACCUSE') {
            ROOM_KEYS.forEach(k => { if(k==="CENTER") return; const op = document.createElement('option'); op.value = k; op.innerText = getKorName(k); roomSelect.appendChild(op); });
            roomSelect.disabled = false;
        } else {
            ROOM_KEYS.forEach(k => { const op = document.createElement('option'); op.value = k; op.innerText = getKorName(k); roomSelect.appendChild(op); });
            if(myLocation.startsWith("Room:")) { roomSelect.value = myLocation.split(":")[1]; roomSelect.disabled = true; }
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