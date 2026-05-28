from flask import Flask, request, jsonify

app = Flask(__name__)

executors = [
    {"id": 1, "name": "Alex"},
    {"id": 2, "name": "Maria"}
]

@app.route('/executors', methods=['GET'])
def get_executors():
    return jsonify(executors)

@app.route('/status/update', methods=['POST'])
def update_status():
    data = request.json

    return jsonify({
        "message": "Status updated",
        "data": data
    })

app.run(port=5002)