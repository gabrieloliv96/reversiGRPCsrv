const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { v4: uuidv4 } = require('uuid');  // Importando o uuid para gerar IDs únicos

// Carregar o arquivo .proto
const packageDef = protoLoader.loadSync(path.join(__dirname, 'reversi.proto'), {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const reversi_proto = grpc.loadPackageDefinition(packageDef).reversi;


const reversiProto = reversi_proto.reversi;

// Variáveis para o jogo de Reversi
let board = Array(8).fill().map(() => Array(8).fill(' '));  // Tabuleiro 8x8 vazio
let currentPlayer = 'Player 1';  // Jogador inicial
let gameState = 'in_progress';  // Estado do jogo (em andamento)
let clients = [];  // Lista de clientes conectados
let players = [];

function chat(call) {
  // Adicionar o cliente à lista de clientes conectados
  clients.push(call);

  // Quando o cliente enviar uma mensagem, retransmitir para todos os outros clientes
  call.on('data', (message) => {
    console.log(`Mensagem recebida de ${message.sender}: ${message.content}`);

    // Enviar a mensagem para todos os clientes conectados, exceto o remetente
    clients.forEach((client) => {
      if (client !== call) {
        // Enviar a mensagem para outros clientes
        client.write({ sender: message.sender, content: message.content });
      }
    });
  });

  // Quando o cliente terminar a comunicação
  call.on('end', () => {
    console.log('Cliente encerrou a comunicação.');
    // Remover o cliente da lista
    clients = clients.filter((client) => client !== call);
    call.end();
  });
}

function game(call) {
  players.push(call);

  call.on('data', (message) => {
    console.log(`Mensagem recebida de ${message.sender}: ${message.content}`);
    players.forEach((player) => {
      if (player !== call) {
        player.write({ event: message.event, content: message.content });
      }
    })
  });

  call.on('end', () => {
    console.log('Cliente encerrou a comunicação.');
    // Remover o cliente da lista
    players = players.filter((player) => player !== call);
    call.end();
  });
}

function initializeClients(call, callback) {
  try {
    const playerId = uuidv4();  // Gerar um ID único para o jogador
    console.log(`Player initialized with ID: ${playerId}`);

    // Armazenar o ID do jogador em metadados
    const metadata = new grpc.Metadata();
    metadata.add('player_id', playerId);

    // Responder ao cliente com o ID gerado
    callback(null, { message: `Jogo iniciado para ${playerId}`, player_id: playerId }, metadata);
  } catch (error) {
    console.error('Erro ao inicializar o jogador:', error);
    callback({
      code: grpc.status.INTERNAL,
      details: 'Erro ao inicializar o jogador',
    });
  }
}

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
  const { sender, content } = call.request;
  console.log(`Mensagem recebida de ${sender}: ${content}`);

  // Enviar mensagem para todos os clientes, exceto o remetente
  clients.forEach(client => {
    if (client !== call) {
      client.write({ sender, content });
    }
  });

  // Responder ao cliente com um status
  callback(null, { status: 'Mensagem recebida', reply: content });
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
    chat: chat,
    game: game,
    initializeClients: initializeClients
  });

  // Iniciar o servidor gRPC na porta 50051
  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
    console.log('Servidor gRPC rodando na porta 50051');
    server.start();
  });
}

main();
