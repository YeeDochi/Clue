/**
 * [ClueGame] Final Fixed Code
 * - 탐정 수첩 '하얀 화면' 버그 수정 (myId 스코프 문제 해결)
 * - 수첩 드래그 이동 기능 적용
 * - 모든 브라우저 기본 Alert/Confirm 제거 -> Core 모달 사용
 */
const ClueGame = (function() {

    // [1] 맵 데이터 및 설정
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

    // [중요] 변수 선언 수정 (myId를 모듈 스코프에 추가)
    let myId = localStorage.getItem('myId');
    let myHand = [], isMyTurn = false, myLocation = "Start_Hall";
    let players = {}, playerChars = {};
    let currentPhase = "", movesLeft = 0;
    let notebookState = {}; // 수첩 데이터

    // ============================
    // 1. 핵심 로직 (Core와 통신)
    // ============================

    function onEnterRoom() {
        renderBoard22x22();
        printLog("대기실에 입장했습니다.");
        // 혹시 모를 드래그 초기화
        setTimeout(initDraggable, 500);
    }

    function printLog(html) {
        const box = document.getElementById('game-logs');
        if(box){const d=document.createElement('div');d.className='log-item';d.innerHTML=html;box.appendChild(d);box.scrollTop=box.scrollHeight;}
    }

    function handleMessage(msg, senderId) {
        // [중요] 메시지 수신 시 내 ID 최신화
        if(senderId) myId = senderId;

        try {
            if (msg.type === 'ERROR') {
                Core.showAlert(`⛔ 오류: ${msg.content}`);
                return;
            }
            if (msg.type === 'GAME_STARTED') {
                Core.showAlert("게임이 시작되었습니다!");
                document.getElementById('startBtn').classList.add('hidden');
                if(msg.data) msg.data.playing = true;
                updateGameState(msg.data);
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
            else if (msg.type === 'SUGGESTION_MADE') {
                const d = msg.data;
                printLog(`🔍 <b>${msg.sender}</b>: [${getKorName(d.suspect)}, ${getKorName(d.weapon)}, ${getKorName(d.room)}] 추리!`);
                if(msg.data) updateGameState(msg.data);

                if (d.refuterId === myId) {
                    openRefuteModal(d);
                } else if (d.status === 'WAITING_RESPONSE') {
                    printLog(`... <b>${d.refuter}</b> 님이 반박 카드를 고르고 있습니다.`);
                } else if (d.status === 'NO_ONE_REFUTED') {
                    printLog(`❌ <b>아무도 반박하지 못했습니다!</b> (강력한 정답 후보)`);
                }
            }
            else if (msg.type === 'SUGGESTION_RESULT') {
                const d = msg.data;
                if (d.success) {
                    if (d.suggestorId === myId) {
                        showRevealedCardModal(d.refuter, d.shownCard || null);
                        if (d.shownCard) {
                            printLog(`✅ <b>${d.refuter}</b>님이 증거 카드를 제시했습니다. (확인 완료)`);
                        } else {
                            printLog(`⚠️ <b>${d.refuter}</b>님이 카드를 제시하지 않았습니다.`);
                        }
                    } else {
                        printLog(`✅ <b>${d.refuter}</b>님이 추리자에게 증거를 제시했습니다.`);
                    }
                } else {
                    printLog(`❌ <b>${d.refuter}</b>님이 반박하지 못했습니다.`);
                }
            }
            else if (msg.type === 'ACCUSE_FAILED') {
                printLog(`🚫 <b>${msg.sender}</b>님의 고발이 틀렸습니다! (탈락)`);
                if(msg.senderId === myId) Core.showAlert("고발 실패! 당신은 탈락했습니다.");
            }
            else if (msg.type === 'GAME_OVER') {
                const d = msg.data;
                Core.showAlert(`🏆 게임 종료! 승자: ${d.winnerName}`);
            }

            if (msg.data) updateGameState(msg.data);
        } catch (e) { console.error("handleMessage Error:", e); }
    }

    function updateGameState(data, idFromCore) {
        if(idFromCore) myId = idFromCore; // Core에서 넘겨준 ID 저장
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

            if(data.playerLocations) {
                refreshTokens(data.playerLocations);
                if(data.playerLocations[myId]) {
                    myLocation = data.playerLocations[myId];
                }
            }

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

            if(data.users && data.users[myId]) {
                myHand = data.users[myId].attributes.hand || [];
                renderHand(myHand);
                // 내 패는 수첩에 자동 체크
                myHand.forEach(c => {
                    notebookState[`${c.name}_${myId}`] = 2; // 2 = ✅
                });
            }
        } catch (e) { console.error("updateGameState Error:", e); }
    }

    // ============================
    // 2. 탐정 수첩 (Fix: 드래그 & 렌더링)
    // ============================
    function toggleNotebook() {
        const p = document.getElementById('notebook-panel');
        if(p.classList.contains('hidden')) {
            p.classList.remove('hidden');
            renderNotebook(); // 그리기
            setTimeout(initDraggable, 100); // 열릴 때 드래그 활성화
        } else {
            p.classList.add('hidden');
        }
    }

    let isDragInitialized = false;
    function initDraggable() {
        // [Fix] 드래그가 여러 번 초기화되어도 문제없도록 체크하지 않음(혹은 위치 재설정)
        const modal = document.getElementById('notebook-panel');
        const header = modal ? modal.querySelector('.box-header') : null;
        if(!modal || !header) return;

        // 커서 변경
        header.style.cursor = 'move';

        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        header.onmousedown = function(e) {
            e.preventDefault();
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = modal.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            // fixed 위치 해제 -> 절대 좌표로 변경하여 이동 가능하게 함
            modal.style.right = 'auto';
            modal.style.bottom = 'auto';
            modal.style.left = initialLeft + 'px';
            modal.style.top = initialTop + 'px';
        };

        document.onmousemove = function(e) {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            modal.style.left = (initialLeft + dx) + 'px';
            modal.style.top = (initialTop + dy) + 'px';
        };

        document.onmouseup = function() {
            isDragging = false;
        };
    }

    function renderNotebook() {
        const head = document.getElementById('notebook-head');
        const body = document.getElementById('notebook-body');
        if(!head || !body) return;

        let playerIds = Object.keys(players);
        // 플레이어 정보가 아직 없으면 '나'라도 표시
        if (playerIds.length === 0 && myId) {
            playerIds = [myId];
        }

        // 1. 헤더 생성
        let headHtml = `<tr><th style="width:80px;">카드</th>`;
        playerIds.forEach(pid => {
            let nick = players[pid] ? players[pid].substring(0, 4) : "나";
            if(pid === myId) nick = "나";
            headHtml += `<th>${nick}</th>`;
        });
        headHtml += `</tr>`;
        head.innerHTML = headHtml;

        // 2. 바디 생성
        const categories = [
            { code: 'SUSPECT', label: '인물', list: SUSPECT_KEYS },
            { code: 'WEAPON', label: '흉기', list: WEAPON_KEYS },
            { code: 'ROOM', label: '장소', list: ROOM_KEYS }
        ];

        let bodyHtml = '';
        categories.forEach(cat => {
            bodyHtml += `<tr><td colspan="${playerIds.length + 1}" class="section-row">${cat.label}</td></tr>`;
            cat.list.forEach(cardKey => {
                const cardName = getKorName(cardKey);
                bodyHtml += `<tr><td style="font-weight:500; text-align:left; padding-left:5px;">${cardName}</td>`;
                playerIds.forEach(pid => {
                    const cellKey = `${cardKey}_${pid}`;
                    const state = notebookState[cellKey] || 0;
                    const mark = getMark(state);
                    const classStr = getStateClass(state);
                    bodyHtml += `<td class="${classStr}" onclick="ClueGame.onNotebookClick('${cardKey}', '${pid}')">${mark}</td>`;
                });
                bodyHtml += `</tr>`;
            });
        });
        body.innerHTML = bodyHtml;
    }

    function onNotebookClick(cardKey, pid) {
        const cellKey = `${cardKey}_${pid}`;
        let state = notebookState[cellKey] || 0;
        state = (state + 1) % 4; // 0->1->2->3->0
        notebookState[cellKey] = state;
        renderNotebook();
    }

    function resetNotebook() {
        Core.showConfirm("수첩을 초기화하시겠습니까?", () => {
            notebookState = {};
            renderNotebook();
        });
    }

    function getMark(s) { return s===1?'❌':(s===2?'✅':(s===3?'❓':'')); }
    function getStateClass(s) { return s===1?'cell-x':(s===2?'cell-o':(s===3?'cell-q':'')); }


    // ============================
    // 3. 게임 플레이 로직 (보드, 이동, 액션)
    // ============================
    function getPhaseName(p) { return p==='ROLL'?"주사위":(p==='MOVE'?"이동":(p==='ACTION'?"행동":"")); }

    function updateButtons() {
        const r = document.getElementById('btn-roll');
        const s = document.getElementById('btn-suggest');
        const a = document.getElementById('btn-accuse');
        const e = document.getElementById('btn-endturn');
        const sp = document.getElementById('btn-secret');

        [r, s, a, e].forEach(btn => { if (btn) btn.disabled = true; });
        if(sp) sp.style.display = 'none';

        if (currentPhase === 'ROLL') {
            if (r) r.disabled = false;
            if (myLocation.startsWith("Room:")) {
                const room = myLocation.split(":")[1];
                const target = getSecretPassageTarget(room);
                if (target && sp) {
                    sp.style.display = 'block';
                    sp.innerHTML = `<i class="fas fa-door-open"></i> ${getKorName(target)}로 이동`;
                    sp.onclick = () => useSecretPassage(target);
                }
            }
        }
        else if (currentPhase === 'MOVE') {
            if (e) e.disabled = false;
        }
        else if (currentPhase === 'ACTION') {
            if (s && myLocation.startsWith("Room:") && myLocation !== "Room:CENTER") s.disabled = false;
            if (a) a.disabled = false;
            if (e) e.disabled = false;
        }
        else if (currentPhase === 'END') {
            if (e) e.disabled = false;
        }
    }

    function useSecretPassage(targetRoom) {
        if (!targetRoom) return;
        Core.showConfirm(
            `<span style="color:#6f42c1; font-weight:bold;">${getKorName(targetRoom)}</span>(으)로 이동하시겠습니까?<br>(이동력 소모 없음)`,
            () => { Core.sendAction({ actionType: 'SECRET_PASSAGE', location: `Room:${targetRoom}` }); }
        );
    }
    function getSecretPassageTarget(roomName) {
        const secretMap = { "KITCHEN": "STUDY", "STUDY": "KITCHEN", "CONSERVATORY": "LOUNGE", "LOUNGE": "CONSERVATORY" };
        return secretMap[roomName] || null;
    }

    function disableAllButtons() { ['btn-roll','btn-suggest','btn-accuse','btn-endturn'].forEach(id=>document.getElementById(id).disabled=true); }
    function updateDiceUI(v) { document.getElementById('dice-display').innerText=`🎲 남은이동: ${v}`; }

    function handleTileClick(x, y, isDoor) {
        if (!isMyTurn || currentPhase !== 'MOVE') return;
        if (movesLeft <= 0) { Core.showAlert("이동력이 부족합니다! 턴을 종료하세요."); return; }

        let isValidMove = false;
        let [cx, cy] = [-1, -1];

        if (myLocation.includes("-")) {
            [cx, cy] = myLocation.split("-").map(Number);
        }

        if (myLocation.startsWith("Room:")) {
            const currentRoomName = myLocation.split(":")[1];
            for (let key in DOOR_MAP) {
                if (DOOR_MAP[key] === currentRoomName) {
                    const [dx, dy] = key.split(',').map(Number);
                    if (isValidDoorEntry(x, y, dx, dy)) { isValidMove = true; break; }
                }
            }
            if (!isValidMove) { Core.showAlert(`[${getKorName(currentRoomName)}] 문 앞 복도로만 이동할 수 있습니다.`); return; }
        }
        else if (cx !== -1 && cy !== -1) {
            if (isDoor) {
                if (isValidDoorEntry(cx, cy, x, y)) isValidMove = true;
                else { Core.showAlert("문의 정면(화살표)으로만 들어갈 수 있습니다."); return; }
            } else {
                if (Math.abs(cx - x) + Math.abs(cy - y) === 1) isValidMove = true;
                else { Core.showAlert("인접한 칸으로만 이동 가능합니다."); return; }
            }
        }

        let target = `${x}-${y}`;
        if (isDoor) {
            const rName = getRoomNameByCoord(x, y) || "HALL";
            target = `Room:${rName}`;
        }
        Core.sendAction({ actionType: 'MOVE', location: target });
    }

    function isValidDoorEntry(curX, curY, doorX, doorY) {
        const rot = getDoorRotation(doorX, doorY);
        if (rot === 0) return curY === doorY - 1 && curX === doorX;
        if (rot === 180) return curY === doorY + 1 && curX === doorX;
        if (rot === 270) return curX === doorX - 1 && curY === doorY;
        if (rot === 90) return curX === doorX + 1 && curY === doorY;
        return false;
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
    function getRoomNameByCoord(x, y) {
        const doorKey = `${x},${y}`; if (DOOR_MAP[doorKey]) return DOOR_MAP[doorKey];
        if (y < 6 && x < 6) return "KITCHEN"; if (y < 6 && x > 8 && x < 15) return "BALLROOM"; if (y < 6 && x > 16) return "CONSERVATORY";
        if (y >= 6 && y < 14) { if (x < 8) return "DINING"; if (x > 16) return "BILLIARD"; if (y > 7 && y < 13 && x > 9 && x < 14) return "CENTER"; }
        if (y >= 14) { if (y < 17 && x > 16) return "LIBRARY"; if (y >= 17) { if (x < 7) return "LOUNGE"; if (x > 8 && x < 15) return "HALL"; if (x > 16) return "STUDY"; } }
        return "HALL";
    }
    function getDoorRotation(x, y) {
        if (x === 20 && y === 6) return 0;
        const isWalkable = (v) => (v === 1 || v === 3);
        if (y > 0 && isWalkable(MAP_DATA[y-1][x])) return 0;
        if (y < 21 && isWalkable(MAP_DATA[y+1][x])) return 180;
        if (x > 0 && isWalkable(MAP_DATA[y][x-1])) return 270;
        if (x < 21 && isWalkable(MAP_DATA[y][x+1])) return 90;
        return 0;
    }

    function refreshTokens(locs) {
        document.querySelectorAll('.token').forEach(e=>e.remove());
        for(const [pid, loc] of Object.entries(locs)) {
            const tid = getTileIdFromLoc(loc);
            const t = document.getElementById(tid);
            if(t) {
                const pName = players[pid] || "?";
                const charKey = playerChars[pid];
                let bgColor = "#555"; let charIcon = "";
                if (charKey && CARD_META[charKey]) {
                    bgColor = CARD_META[charKey].color;
                    charIcon = CARD_META[charKey].icon;
                }
                const d = document.createElement('div'); d.className='token';
                d.innerText = charIcon || pName.charAt(0);
                d.style.backgroundColor = bgColor;
                d.title = `${pName} (${charKey ? getKorName(charKey) : "Unknown"})`;
                const cnt = t.querySelectorAll('.token').length;
                d.style.transform = `translate(${cnt*4}px, ${cnt*4}px)`;
                t.appendChild(d);
            }
        }
    }
    function getTileIdFromLoc(loc) {
        if(loc === "Start_Hall") return "tile-11-10";
        if(loc.startsWith("Room:")) {
            const r = loc.split(":")[1];
            if(r==="KITCHEN") return "tile-2-2"; if(r==="BALLROOM") return "tile-11-2"; if(r==="CONSERVATORY") return "tile-19-2";
            if(r==="DINING") return "tile-2-10"; if(r==="BILLIARD") return "tile-19-8"; if(r==="CENTER") return "tile-11-10";
            if(r==="LIBRARY") return "tile-19-14"; if(r==="LOUNGE") return "tile-2-19"; if(r==="HALL") return "tile-11-20";
            if(r==="STUDY") return "tile-19-20";
            return "tile-11-10";
        }
        const [lx, ly] = loc.split("-");
        return `tile-${lx}-${ly}`;
    }

    function renderHand(cards) {
        const c=document.getElementById('my-hand-area'); c.innerHTML='';
        if(cards) cards.forEach(cd => {
            const m = getMeta(cd.name);
            const e = document.createElement('div');
            e.className=`clue-card ${cd.type.toLowerCase()}`;
            e.innerHTML=`<div class="card-type">${getKorType(cd.type)}</div><div class="card-body"><div class="card-icon">${m.icon}</div><div class="card-name">${m.name}</div></div>`;
            c.appendChild(e);
        });
    }

    function rollDice(){ Core.sendAction({actionType:'ROLL_DICE'}); }
    function startGame(){ Core.sendAction({actionType:'START'}); }
    function endTurn() {
        if (!isMyTurn) return;
        if (currentPhase === 'MOVE' && movesLeft > 0) {
            Core.showConfirm("아직 이동력이 남았습니다.<br>정말 턴을 종료하시겠습니까?", () => { Core.sendAction({ actionType: 'TURN_END' }); });
        } else { Core.sendAction({ actionType: 'TURN_END' }); }
    }

    function openActionModal(t){
        const modal = document.getElementById('action-modal');
        modal.classList.remove('hidden');
        document.getElementById('action-modal-title').innerText = (t==='ACCUSE' ? '고발하기' : '추리하기');
        currentActionType=t;
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
    let currentActionType = "";
    function submitAction(){
        const s=document.getElementById('sel-suspect').value, w=document.getElementById('sel-weapon').value, r=document.getElementById('sel-room').value;
        Core.sendAction({actionType:currentActionType, suspect:s, weapon:w, room:r});
        document.getElementById('action-modal').classList.add('hidden');
    }

    function openRefuteModal(d) {
        const modal = document.getElementById('refute-modal');
        modal.classList.remove('hidden');
        document.getElementById('refute-msg').innerHTML = `상대의 추리:<br><span style="color:#ffcc00; font-size:1.2em;">${getKorName(d.suspect)} / ${getKorName(d.weapon)} / ${getKorName(d.room)}</span>`;
        const listContainer = document.getElementById('refute-card-list');
        listContainer.innerHTML = '';

        const targets = [{ key: d.suspect, type: 'SUSPECT' }, { key: d.weapon, type: 'WEAPON' }, { key: d.room, type: 'ROOM' }];
        let hasMatch = false;

        targets.forEach(item => {
            const meta = getMeta(item.key);
            const myCard = myHand.find(c => c.name === item.key);
            const e = document.createElement('div');
            e.className = `clue-card ${item.type.toLowerCase()} refute-option`;
            if (!myCard) {
                e.classList.add('disabled-card');
                e.innerHTML = `<div class="card-type">${getKorType(item.type)}</div><div class="card-body" style="background:#ddd;"><div class="card-icon" style="opacity:0.3;">${meta.icon}</div><div class="card-name" style="color:#999; text-decoration:line-through;">${meta.name}</div><div style="font-size:10px; color:red; margin-top:2px;">(없음)</div></div>`;
            } else {
                hasMatch = true;
                e.style.cursor = "pointer"; e.style.border = "3px solid #00ff00"; e.style.transform = "scale(1.05)";
                e.innerHTML = `<div class="card-type">${getKorType(item.type)}</div><div class="card-body"><div class="card-icon">${meta.icon}</div><div class="card-name">${meta.name}</div><div style="font-size:10px; color:#008000; font-weight:bold; margin-top:2px;">반박 가능!</div></div>`;
                e.onclick = () => {
                    Core.showConfirm(`[<span style="color:${meta.color||'#333'}">${meta.name}</span>] 카드를<br>증거로 제시하시겠습니까?`, () => {
                        Core.sendAction({actionType: 'RESPONSE', card: myCard});
                        modal.classList.add('hidden');
                    });
                };
            }
            listContainer.appendChild(e);
        });

        if (!hasMatch) {
            const passBtn = document.createElement('button'); passBtn.className = 'btn-danger'; passBtn.innerText = '반박할 카드가 없습니다 (패스)'; passBtn.style.marginTop = '20px'; passBtn.style.width = '100%';
            passBtn.onclick = () => { Core.sendAction({actionType: 'RESPONSE', card: null}); modal.classList.add('hidden'); };
            listContainer.appendChild(passBtn);
        }
    }

    function showRevealedCardModal(refuterName, cardData) {
        const modal = document.getElementById('result-modal');
        const msgArea = document.getElementById('result-msg');
        const cardArea = document.getElementById('revealed-card-area');
        if (cardData) {
            msgArea.innerHTML = `<b style="color:#d73a49;">${refuterName}</b>님이<br>반박 증거를 제시했습니다.`;
            const meta = getMeta(cardData.name);
            const typeKor = getKorType(cardData.type);
            cardArea.innerHTML = `<div class="clue-card ${cardData.type.toLowerCase()}" style="box-shadow: 0 5px 15px rgba(0,0,0,0.5);"><div class="card-type">${typeKor}</div><div class="card-body"><div class="card-icon" style="font-size:40px;">${meta.icon}</div><div class="card-name" style="font-size:14px;">${meta.name}</div></div></div>`;
        } else {
            msgArea.innerHTML = `<b style="color:#d73a49;">${refuterName}</b>님이<br>증거를 제시하지 않았습니다.`;
            cardArea.innerHTML = `<div class="clue-card" style="background:#eee; border-color:#aaa; box-shadow: none;"><div class="card-type" style="background:#777;">PASS</div><div class="card-body"><div class="card-icon" style="font-size:40px; opacity:0.3;">🚫</div><div class="card-name" style="color:#777;">카드 없음</div></div></div>`;
        }
        modal.classList.remove('hidden');
    }

    // 유틸
    function fillSelect(id,k){ const s=document.getElementById(id); s.innerHTML=''; k.forEach(v=>{const o=document.createElement('option');o.value=v;o.innerText=getKorName(v);s.appendChild(o);}); }
    function getKorName(k){ return CARD_META[k]?CARD_META[k].name:k; }
    function getMeta(k){ return CARD_META[k]||{name:k,icon:'?',color:'#eee'}; }
    function getKorType(t) { if(t === 'SUSPECT') return '인물'; if(t === 'WEAPON') return '흉기'; if(t === 'ROOM') return '장소'; return t; }

    return {
        toggleNotebook, onNotebookClick, resetNotebook,
        onEnterRoom, useSecretPassage, handleMessage, startGame, rollDice, endTurn,
        openSuggestModal:()=>openActionModal('SUGGEST'), openAccuseModal:()=>openActionModal('ACCUSE'), submitAction
    };
})();
Core.init(ClueGame, { apiPath:'/Clue', wsPath:'/Clue/ws', gameName:'Clue' });