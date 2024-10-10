from your_module import Spread  # Replace with the actual import if needed
from pandas import DataFrame
from flask import jsonify
from flask import Flask, redirect, url_for, session, request, jsonify, send_from_directory
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

        # Step 1: Create a new table with the same structure as 'applicants' but without data
        cursor.execute(
            "CREATE TABLE applicants_copy AS TABLE applicants WITH NO DATA;")

        # Commit the table creation
        conn.commit()

        # Step 2: Read data from Google Sheets and prepare for insertion
        s = Spread("cv-review")
        df = s.sheet_to_df()
        df_list = df.to_dict(orient='records')

        # Convert all data to uppercase for consistency
        df_upper = [{key: str(value).upper(
        ) if value is not None else value for key, value in record.items()} for record in df_list]

        # Insert data into the temporary table
        for record in df_upper:
            columns = ', '.join(record.keys())
            values_placeholder = ', '.join(['%s'] * len(record))
            insert_query = f"INSERT INTO applicants_copy ({columns}) VALUES ({
                values_placeholder})"
            cursor.execute(insert_query, tuple(record.values()))

        # Commit the data insertion
        conn.commit()

        # Step 3: Insert new records into the original table from the new table
        insert_query = """
            INSERT INTO applicants (applicantname, address, city, contactnumber, email, education, experience, skills, dateofapplication, resumelink)
            SELECT applicantname, address, city, contactnumber, email, education, experience, skills, dateofapplication, resumelink
            FROM applicants_copy
            WHERE NOT EXISTS (
                SELECT 1
                FROM applicants
                WHERE applicants.applicantname = applicants_copy.applicantname
            );
        """
        cursor.execute(insert_query)

        # Commit the insertions
        conn.commit()

        # Step 4: Drop the temporary table
        cursor.execute("DROP TABLE applicants_copy;")
        conn.commit()

        # Close the cursor and connection
        cursor.close()
        conn.close()

        return jsonify({'message': 'Database updated successfully!'})

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': 'Failed to update the database'}), 500

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
