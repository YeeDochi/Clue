const ClueGame = (function() {

    function onEnterRoom() {
        console.log("Clue Game Entered");
        // 게임 초기화 로직
    }

    function handleMessage(msg, myId) {
        console.log("Clue Message:", msg);
        // 게임 메시지 처리 로직
    }

    return {
        onEnterRoom,
        handleMessage
    };
})();

// Core 초기화
Core.init(ClueGame, {
    apiPath: '/Clue',
    wsPath: '/Clue/ws',
    gameName: 'Clue'
});