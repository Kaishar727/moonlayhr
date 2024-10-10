from flask import Flask, request, jsonify
from gspread_pandas import Spread
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.agent_toolkits.sql.toolkit import SQLDatabaseToolkit
from langchain_community.agent_toolkits.sql.base import create_sql_agent
from langchain.memory import ConversationBufferWindowMemory
from langchain_community.utilities import SQLDatabase
import pandas as pd
from flask_cors import CORS
import json
import psycopg2
from apscheduler.schedulers.background import BackgroundScheduler

app = Flask(__name__)
CORS(app)



# Set up the environment variable for the Google API key
os.environ["GOOGLE_API_KEY"] = "AIzaSyBPsmNUDwSp_l4CAC_Ym2efOf6CbGcYZmc"

db = SQLDatabase.from_uri('postgresql+psycopg2://postgres:admin@localhost/cv_receiver')

# Initialize the LLM with the Google Generative AI model
llm = ChatGoogleGenerativeAI(model="gemini-pro")

toolkit = SQLDatabaseToolkit(db=db, llm=llm)

# Setup the memory to retain context of the last 2 exchanges
memory = ConversationBufferWindowMemory(k=2)

# Model = OllamaLLM(model="llama3")

agent_executor = create_sql_agent(
    llm = llm,
    toolkit = toolkit,
    verbose=True
)

# agent = create_csv_agent(llm, 'static/temp.csv', verbose=True,
                         # Create the agent with CSV capabilities and memory for conversation context
           #              allow_dangerous_code=True, memory=memory, handle_parsing_errors=True)


def update_database():
    try:
        # Read data from Google Sheets
        s = Spread("cv-review")
        df = s.sheet_to_df()

        # Convert all data in the DataFrame to uppercase
        df = df.apply(lambda col: col.map(
            lambda x: str(x).upper() if pd.notnull(x) else x))

        # Drop the '__powerappsid__' column if it exists
        if '__powerappsid__' in df.columns:
            df = df.drop(columns='__powerappsid__')

        # Establish a connection to the PostgreSQL database
        conn = psycopg2.connect(
            dbname="cv_receiver",
            user="postgres",
            password="admin",
            host="localhost",
            port="5432"
        )
        cursor = conn.cursor()

        # Insert data into PostgreSQL
        for record in df.to_dict(orient='records'):
            columns = ', '.join(record.keys())
            values = ', '.join(['%s'] * len(record))
            insert_query = f"INSERT INTO applicants ({columns}) VALUES ({
                values})"
            cursor.execute(insert_query, tuple(record.values()))

        conn.commit()

        # Close the cursor and connection
        cursor.close()
        conn.close()

        print("Database updated successfully.")
    except Exception as e:
        print("Error:", e)
        raise Exception('Failed to update the database')




    

# Set up the APScheduler
scheduler = BackgroundScheduler()
scheduler.add_job(update_database, 'interval', minutes=3)
scheduler.start()

@app.route('/records.json')
def get_records():
    try:
            
        update_database();
        # Establish a connection to the PostgreSQL database
        conn = psycopg2.connect(
            dbname="cv_receiver",
            user="postgres",
            password="admin",
            host="localhost",
            port="5432"
        )

        # Create a cursor object
        cursor = conn.cursor()
        # Execute the query
        # Replace 'your_table_name' with your actual table name
        query = "SELECT * FROM applicants;"
        cursor.execute(query)

        # Fetch all rows from the executed query
        rows = cursor.fetchall()

        # Fetch column names
        column_names = [desc[0] for desc in cursor.description]

        # Convert rows to a list of dictionaries
        data = [dict(zip(column_names, row)) for row in rows]

        # Close the cursor and connection
        cursor.close()
        conn.close()

        # Return JSON response
        return jsonify(data)
    except Exception as e:
        print(e)
        return jsonify({'error': 'Failed to fetch records'}), 500



@app.route('/bot-api', methods=['POST'])

def handle_data():
    
  data = request.get_json()
  
  print(data)

  custom_prompt = ("You are an analytical chatbot tasked with assisting the user in understanding the CSV spreadsheet "
                   "answer in the form of a row of values that contain all the columns of the CSV spreadsheet where the relevant answer was foundformatted to be readable to the end user. The format "
                   "should be as follows:\n\n"
                   "Applicant Name:\n"
                   "value1\n\n"
                   "Applicant Skills:\n"
                   "value2\n\n"
                   "Applicant Resume:\n"
                   "value3\n\n"
                   "And so on for each column in the row. Ensure that each column name is followed by its respective value, each on "
                   "a new line. This format will help in presenting the information in a clear and organized manner."
                   " Do this for the columns Applicant, Address, City, Contact Number, Email, Education, Experience, Skills, Date of Application, and Resume"
                   "Repeat this process for each applicant/value that is found by you"
                   )
  
  user_prompt = custom_prompt + json.dumps(data)
  
  response = agent_executor.invoke(user_prompt) 

  # Extract only the output (assuming response is structured as a dict with an 'output' key)
  output = response.get('output', '') if isinstance(
      response, dict) else response

  print(output)
  
  output_str = str(output)
  
  return jsonify({'message': 'Data received successfully!', 'bot_response': output_str})



if __name__ == '__main__':
    app.run(debug=True)
