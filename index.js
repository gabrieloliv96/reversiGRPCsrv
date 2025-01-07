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
var reversi_proto = grpc.loadPackageDefinition(packageDef).reversi;
//var routeguide = protoDescriptor.routeguide;
const reversiProto = reversi_proto.reversi;

// Variáveis para o jogo de Reversi
let board = Array(8).fill().map(() => Array(8).fill(' '));  // Tabuleiro 8x8 vazio
let currentPlayer = 'Player 1';  // Jogador inicial
let gameState = 'in_progress';  // Estado do jogo (em andamento)
let players = {};

function initializeClients(call, callback) {
  try {
    // Gerar um ID único para o jogador
    const playerId = uuidv4();
    console.log(`inicializando o player ${playerId}`);  // Exibe o ID gerado

    // Armazenar o jogador no "banco de dados" (neste caso, um objeto simples)
    players[playerId] = {
      id: playerId,
      gameState: 'initialized',
    };

    // Chama o callback com a resposta de sucesso
    callback(null, { message: `Jogo iniciado para ${playerId}`, player_id: playerId });

  } catch (error) {
    // Caso ocorra algum erro, captura e retorna a mensagem de erro
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


function chat(call) {
  // Adiciona a stream do cliente
  call.on('data', (message) => {
    const { sender, receiver, content } = message;
    console.log(`Mensagem de ${sender} para ${receiver}: ${content}`);

    // Envia a mensagem para o cliente destinatário
    if (clients[receiver]) {
      clients[receiver].write({ sender, receiver, content });
    } else {
      console.log(`Destinatário ${receiver} não encontrado`);
    }
  });

  // Quando o cliente se desconectar, remove a stream do dicionário
  call.on('end', () => {
    Object.keys(clients).forEach((client) => {
      if (clients[client] === call) {
        delete clients[client];
        console.log(`${client} desconectado.`);
      }
    });
  });

  // Adiciona a stream do cliente no dicionário
  call.on('ready', () => {
    console.log('Novo cliente conectado');
  });

  call.on('error', (e) => {
    console.error(`Erro na conexão: ${e.message}`);
  });

  // Quando o cliente se conecta, armazena sua stream
  call.on('data', (message) => {
    clients[message.sender] = call;
  });
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
  callback(null, { status: 'Mensagem recebida', message });
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
    initializeClients: initializeClients
    // firstPlayer: firstPlayer,
  });

  // Iniciar o servidor gRPC na porta 50051
  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
    console.log('Servidor gRPC rodando na porta 50051');
    server.start();
  });
}

main();
