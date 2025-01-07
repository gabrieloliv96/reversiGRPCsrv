const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Carregar o arquivo .proto
const packageDef = protoLoader.loadSync(path.join(__dirname, 'reversi.proto'), {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
var reversi_proto = grpc.loadPackageDefinition(packageDef).reversi;
//var routeguide = protoDescriptor.routeguide;
const reversiProto = reversi_proto.reversi;

// Variáveis para o jogo de Reversi
let board = Array(8).fill().map(() => Array(8).fill(' '));  // Tabuleiro 8x8 vazio
let currentPlayer = 'Player 1';  // Jogador inicial
let gameState = 'in_progress';  // Estado do jogo (em andamento)

// Função para iniciar o jogo
function startGame(call, callback) {
  const playerName = call.request.player_name;
  board = Array(8).fill().map(() => Array(8).fill(' '));  // Reiniciar o tabuleiro
  currentPlayer = playerName;  // Definir o jogador inicial
  gameState = 'in_progress';  // Jogo iniciado
  callback(null, { message: `Jogo iniciado para ${playerName}`, player_name: playerName });
}

// Função para fazer um movimento
function makeMove(call, callback) {
  const { player_name, row, col } = call.request;

  // Verificar se o movimento é válido (a lógica para isso pode ser implementada)
  if (row < 0 || row >= 8 || col < 0 || col >= 8 || board[row][col] !== ' ') {
    callback(null, { message: 'Movimento inválido', move_valid: false, current_player: currentPlayer, board });
    return;
  }

  // Realizar o movimento no tabuleiro
  board[row][col] = currentPlayer === 'Player 1' ? 'X' : 'O';

  // Alternar o jogador
  currentPlayer = currentPlayer === 'Player 1' ? 'Player 2' : 'Player 1';

  callback(null, { message: 'Movimento realizado com sucesso', move_valid: true, current_player: currentPlayer, board: { rows: board.map(row => row.join('')) } });
}

function sendMessage(call, callback) {
  const message = call.request.message;
  console.log(`Mensagem recebida: ${message}`);

  // Retornar uma resposta
  callback(null, { status: 'Mensagem recebida' });
}

// Função para obter o estado atual do tabuleiro
function getBoard(call, callback) {
  callback(null, { rows: board.map(row => row.join('')) });
}

// Função para obter o estado atual do jogo
function getGameState(call, callback) {
  callback(null, { state: gameState, winner: gameState === 'finished' ? 'Player 1' : '' });
}

// Criar o servidor gRPC
const server = new grpc.Server();

// Adicionar os serviços definidos no .proto ao servidor
function main() {
  server.addService(reversi_proto.ReversiGameService.service, {
    startGame: startGame,
    makeMove: makeMove,
    getBoard: getBoard,
    getGameState: getGameState,
    sendMessage: sendMessage,
    // firstPlayer: firstPlayer,
  });

  // Iniciar o servidor gRPC na porta 50051
  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
    console.log('Servidor gRPC rodando na porta 50051');
    server.start();
  });
}

main();
