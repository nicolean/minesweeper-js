const beginnerGrid = { height: 8, width: 8, mineCount: 10, safeCount: 54 };
const intermediateGrid = { height: 16, width: 16, mineCount: 40, safeCount: 216 };
const expertGrid = { height: 16, width: 30, mineCount: 99, safeCount: 381 };

const levels = { "BEG": beginnerGrid, "INT": intermediateGrid, "EXP": expertGrid };

let selectedLevel = 'INT';
let time = '000';
let default_time = '000';
let timeInterval;
let start = false;
let clockStart = false;
let sweptCellCount = 0;
let actualMineCount = levels[selectedLevel].mineCount;
let mineCount = levels[selectedLevel].mineCount;
let flaggedCellCount = 0;

let gameMap;

$(document).ready( function() {
  buildGame(selectedLevel);

  $(document).on('contextmenu', '.grid-cell', function(event) {
    event.preventDefault();
    let cell = $(this);
    if (!cell.hasClass('flagged') && !cell.hasClass('clicked')) {
      cell.addClass('flagged');
      mineCount--;
      $('#mine-count').html(mineCount);
    } else if (cell.hasClass('flagged') && !cell.hasClass('clicked')) {
      cell.removeClass('flagged');
      mineCount++;
      $('#mine-count').html(mineCount);
    }
  })

  // set position of game menus 
  let gameMenu = document.getElementById('game-menu-game-button');
  let gameMenuPositionInfo = gameMenu.getBoundingClientRect();
  $('#game-menu-game').css("left",gameMenuPositionInfo.x);
  $('#game-menu-help').css("left",gameMenuPositionInfo.x+gameMenuPositionInfo.width);

});

// FIXME: need to add close menu if you click anywhere other than the menus

function restartGame() {
  stopClock(true);
  buildGame(selectedLevel);
  $('#smiley').removeClass().addClass('smile');
  closeMenus();
}

function buildGame() {

  let currentLevel = levels[selectedLevel];
  let totalCells = currentLevel.height * currentLevel.width;
  let blankCells = totalCells - currentLevel.mineCount;
  let gridHeight = currentLevel.height;
  let gridWidth = currentLevel.width;

  sweptCellCount = 0;

  mineCount = currentLevel.mineCount;

  let gameString = '';
  for (let m = 0; m < currentLevel.mineCount; m++) {
    gameString += '*';
  }
  for (let c = 0; c < blankCells; c++) {
    gameString += 0;
  }

  let gameArray = scramble(gameString);
  let gameGrid = _.chunk(gameArray, currentLevel.width);
  gameMap = gameGrid;

  // build out numbers
  for (let r = 0; r < gameGrid.length; r++) {
    for (let c = 0; c < gameGrid[r].length; c++) {
      if (gameGrid[r][c] == '*') {
        let surroundingCells = getSurroundingCells(r, c);
        surroundingCells.map(x => {
          scId = x[2];
          if (gameGrid[x[0]][x[1]] !== '*') {
            gameGrid[x[0]][x[1]]++;
          }
        })
      }
    }
  }
  buildGrid(currentLevel, gameGrid);
  console.log(gameGrid);
  gameMap = gameGrid;
}

function buildGrid(level, grid) {
  let gridHtml = '';
  for (let r = 0; r < grid.length; r++) {
    gridHtml += '<div class="grid-row">';
    for (let c = 0; c < grid[r].length; c++) {
      gridHtml += '<div class="grid-cell" onclick="clickCell('+r+','+c+')" id="r'+r+'c'+c+'"></div>';
    }
    gridHtml += '</div>';
  }
  $('#mine-count').html(level.mineCount);
  $('#grid-container').html(gridHtml);
}

function scramble(a) {
  a = a.split("");
  for (var b = a.length-1; 0 < b; b--) {
    var c = Math.floor(Math.random()*(b + 1));
    d = a[b];
    a[b] = a[c];
    a[c] = d;
  }
  return a;
}

function clickCell(row, col, skipClick = false) {
  if (start === false) {
    console.log('start is false click',time);
    if (gameMap[row][col] === '*') {
      buildGame(selectedLevel);
      clickCell(row, col);
    } else {
      // TODO: if their first click is a flag
      start = true;
      startClock();
    }
  }
  let cell = $('#r'+row+'c'+col);
  if (!cell.hasClass('flagged') && !cell.hasClass('clicked')) {
    if (gameMap[row][col] === '*') {
      revealCell(row, col, false);
      cell.addClass('exploded');
      explode();
    } else if (gameMap[row][col] == '0') {
      revealCell(row, col, true);
      let surroundingCells = getSurroundingCells(row, col);
      surroundingCells.map(x => {
        let scRow = x[0];
        let scCol = x[1];
        let scId = x[2];
        if (!$(scId).hasClass('clicked')) {
          if (gameMap[scRow][scCol] == '0') {
            clickCell(scRow, scCol);
          }
          if (gameMap[scRow][scCol] !== '*') {
            // $(scId).addClass('clicked');
            if (!$(scId).hasClass('flagged')) {
              revealCell(scRow, scCol, true);
            }
          }
        }
      })
    } else if (gameMap[row][col] !== '*') {
      revealCell(row, col, true);
    }
  }
  if (skipClick == false) {
    if (cell.hasClass('clicked')) {
      let flagCheck = adjacentFlagCheck(row, col);
      if (flagCheck == gameMap[row][col]) {
        let surroundingCells = getSurroundingCells(row, col);
        surroundingCells.map(x => {
          clickCell(x[0], x[1], true);
        })
      }
    }
  }
}

function revealCell(row, col, counter = true) {
  let cell = $('#r'+row+'c'+col);
  $('#r'+row+'c'+col).addClass('num'+gameMap[row][col]);
  if (!cell.hasClass('clicked')) {
    cell.addClass('clicked');
    if (counter == true) {
      sweptCellCount++;
    }
  }
  checkGame();
}

function adjacentFlagCheck(row, col) {
  let result = 0;
  let surroundingCells = getSurroundingCells(row, col);
  surroundingCells.map(x => {
    let scId = x[2];
    if ($(scId).hasClass('flagged')) {
      result++;
    }
  })
  return result;
}

function checkGame() {
  if (sweptCellCount == levels[selectedLevel].safeCount) {
    console.log('complete!');
    finishGame();
    stopClock(false);
    $('#smiley').removeClass().addClass('win');
    start = false;
    
  }
}

function finishGame() {
  for (r = 0; r < gameMap.length; r++) {
    for (c = 0; c < gameMap[r].length; c++) {
      let id = '#r'+r+'c'+c;
      if (!$(id).hasClass('clicked') && !$(id).hasClass('flagged') && gameMap[r][c] === '*') {
        mineCount--;
        $('#mine-count').html(mineCount);
        $(id).addClass('flagged');
      }
    }
  }
}

function getSurroundingCells(row, col, obj = false) {
  let prevRow = row-1;
  let nextRow = row+1;
  let prevCol = col-1;
  let nextCol = col+1;

  let cells_obj = { tl: {}, tm: {}, tr: {}, ml: {}, mr: {}, bl: {}, bm: {}, br: {}};
  let cells_arr = [];

  // | TL | TM | TR |
  // |----|----|----|
  // | ML |CELL| MR |
  // |----|----|----|
  // | BL | BM | BR |

  // row before
  if (row > 0) {
    if (col > 0) {
      cells_obj.tl.id = '#r'+prevRow+'c'+prevCol;
      cells_obj.tl.row = prevRow;
      cells_obj.tl.row = prevCol;
      cells_arr.push([prevRow, prevCol, '#r'+prevRow+'c'+prevCol]);
    }
    cells_obj.tm.id = '#r'+prevRow+'c'+col;
    cells_obj.tm.row = prevRow;
    cells_obj.tm.row = col;
    cells_arr.push([prevRow, col, '#r'+prevRow+'c'+col]);

    if (col < gameMap[row].length - 1) {
      cells_obj.tr.id = '#r'+prevRow+'c'+nextCol;
      cells_obj.tr.row = prevRow;
      cells_obj.tr.row = nextCol;
      cells_arr.push([prevRow, nextCol, '#r'+prevRow+'c'+nextCol]);
    }
  }
  // current row
  if (col > 0) {
    cells_obj.ml.id = '#r'+row+'c'+prevCol;
    cells_obj.ml.row = row;
    cells_obj.ml.row = prevCol;
    cells_arr.push([row, prevCol, '#r'+row+'c'+prevCol]);
  }
  if (col < gameMap[row].length - 1) {
    cells_obj.mr.id = '#r'+row+'c'+nextCol;
    cells_obj.mr.row = row;
    cells_obj.mr.row = nextCol;
    cells_arr.push([row, nextCol, '#r'+row+'c'+nextCol]);
  }
  // next row
  if (row < gameMap.length - 1) {
    if (col > 0) {
      cells_obj.bl.id = '#r'+nextRow+'c'+prevCol;
      cells_obj.bl.row = nextRow;
      cells_obj.bl.row = prevCol;
      cells_arr.push([nextRow, prevCol, '#r'+nextRow+'c'+prevCol]);
    }
    cells_obj.bm.id = '#r'+nextRow+'c'+col;
    cells_obj.bm.row = nextRow;
    cells_obj.bm.row = col;
    cells_arr.push([nextRow, col, '#r'+nextRow+'c'+col]);
    if (col < gameMap[row].length - 1) {
      cells_obj.br.id = '#r'+nextRow+'c'+nextCol;
      cells_obj.br.row = nextRow;
      cells_obj.br.row = nextCol;
      cells_arr.push([nextRow, nextCol, '#r'+nextRow+'c'+nextCol]);
    }
  }

  if (obj) {
    return cells_obj;
  } else {
    return cells_arr;
  }
  
}

function explode() {
  $('.grid-cell').addClass('clicked');
  $('#smiley').removeClass().addClass('dead');
  reveal();
  stopClock(false);
}

function reveal() {
  for (let r = 0; r < gameMap.length; r++) {
    for (let c = 0; c < gameMap[r].length; c++) {
      let id = '#r'+r+'c'+c;
      if (gameMap[r][c] !== '0' && gameMap[r][c] !== '*') {
        if ($(id).hasClass('flagged')) {
          $(id).removeClass('num'+gameMap[r][c]).addClass('wrong');
        } else {
          $(id).addClass('num'+gameMap[r][c]);
        }
      } else if (gameMap[r][c] == '*') {
        if (!$(id).hasClass('flagged')) {
          $(id).addClass('mine');
        }
      }
    }
  }
}

function startClock() {
  console.log('start clock');
  if (timeInterval) {
    clearInterval(timeInterval);
  }
  clockStart = true;
  timeInterval = setInterval(function() {
    if (time <= 999 && start === true && clockStart === true) {
      time++;
      formattedTime = time.toString().padStart(3, '0');
      $('#timer').html(formattedTime);
    }
  }, 1000);
}

function stopClock(reset) {
  console.log('stop clock');
  clearInterval(timeInterval);
  clockStart = false;
  if (reset === true) {
    time = default_time;
    $('#timer').html(time);
  }
}

function selectLevel(level) {
  selectedLevel = level.toUpperCase();
  closeMenus();
  stopClock();
  buildGame(selectedLevel);
}

function closeMenus() {
  console.log('closing');
  $('.game-menu-item').removeClass('active');
  $('.game-menu-context').removeClass('show');
}

function toggleMenu(menu) {
  $('#'+menu).toggleClass('show');
  $('#'+menu+'-button').toggleClass('active');
}