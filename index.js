const gRPC = require('@grpc/grpc-js');
const protoLoader = require("@grpc/proto-loader");

const packageDef = protoLoader.loadSync("product.proto", {});
const gRPCObject = gRPC.loadPackageDefinition(packageDef);

const productPackage = gRPCObject.product;

const products = [];

function createProduct(call, callback) {}
function readProduct(call, callback) {}
function readProducts(call, callback) {}
function updateProduct(call, callback) {}
function deleteProduct(call, callback) {}

const server = new gRPC.Server();
server.addService(productPackage.Product.service, {
  createProduct,
  readProduct,
  readProducts,
  updateProduct,
  deleteProduct,
});

server.bindAsync("0.0.0.0:4000", gRPC.ServerCredentials.createInsecure(), () => {
  server.start();
});