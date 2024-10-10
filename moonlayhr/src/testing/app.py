from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import create_json_chat_agent
from langchain.memory import ConversationBufferWindowMemory
import pandas as pd
from sqlalchemy import create_engine

app = Flask(__name__)
CORS(app)

# Set up the environment variable for the Google API key
os.environ["GOOGLE_API_KEY"] = "AIzaSyBPsmNUDwSp_l4CAC_Ym2efOf6CbGcYZmc"

# Setup the memory to retain context of the last 2 exchanges
memory = ConversationBufferWindowMemory(k=2)

# Initialize the LLM with the Google Generative AI model
llm = ChatGoogleGenerativeAI(model="gemini-pro")

# Create the JSON chat agent
agent = create_json_chat_agent(llm, memory=memory, handle_parsing_errors=True)

# Set up PostgreSQL connection
DATABASE_URI = 'postgresql+psycopg2://your_username:your_password@localhost/cv_review'
engine = create_engine(DATABASE_URI)


def fetch_data():
    # Query the database and return a DataFrame
    df = pd.read_sql_table('applicants', engine)
    # Convert DataFrame to JSON
    return df.to_json(orient='records')


@app.route('/records.json')
def get_records():
    try:
        # Load data from PostgreSQL and convert to JSON
        data_json = fetch_data()
        return jsonify(json.loads(data_json))
    except Exception as e:
        print(e)
        return jsonify({'error': 'Failed to fetch records'}), 500


@app.route('/bot-api', methods=['POST'])
def handle_data():
    data = request.get_json()
    user_query = data.get('key', '')

    # Fetch data from PostgreSQL and convert it to JSON
    context = fetch_data()

    # Create the prompt for the agent
    prompt = {
        "context": context,
        "query": user_query
    }

    try:
        # Use the JSON chat agent to get the response
        response = agent.invoke(prompt)
        output_str = response.get('output', '')
        return jsonify({'message': 'Data received successfully!', 'bot_response': output_str})
    except Exception as e:
        print("Error querying agent:", e)
        return jsonify({'error': 'Failed to process the request'}), 500


if __name__ == '__main__':
    app.run(debug=True)
