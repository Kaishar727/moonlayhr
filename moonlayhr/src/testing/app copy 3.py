from flask import jsonify
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
import getpass
from apscheduler.schedulers.background import BackgroundScheduler
from langchain_groq import ChatGroq
import mysql.connector
from datetime import datetime

app = Flask(__name__)
CORS(app)



# Set up the environment variable for the Google API key
# os.environ["GOOGLE_API_KEY"] = "AIzaSyBPsmNUDwSp_l4CAC_Ym2efOf6CbGcYZmc"
os.environ["GROQ_API_KEY"] = "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"

db = SQLDatabase.from_uri(
    'mysql+mysqlconnector://moon_ai:lc9xHh87tO7FENl%40@52.221.197.46:3306/moon_ai')


generation_config = {
    "temperature": 0.4,
    "top_p": 0.95,
    "top_k": 64,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}

# Initialize the LLM with the Google Generative AI model
# llm = ChatGoogleGenerativeAI(model="gemini-pro", temperature=0.6)

llm = ChatGroq(
    model="mixtral-8x7b-32768",
    temperature=0,
    max_tokens=None,
    timeout=None,
    max_retries=2,
    # other params...
)

toolkit = SQLDatabaseToolkit(db=db, llm=llm)

# Setup the memory to retain context of the last 2 exchanges
memory = ConversationBufferWindowMemory(k=2)

# Model = OllamaLLM(model="llama3")

agent_executor = create_sql_agent(
    llm = llm,
    toolkit = toolkit,
    verbose=True,
    handle_parsing_errors=True
)

# agent = create_csv_agent(llm, 'static/temp.csv', verbose=True,
                         # Create the agent with CSV capabilities and memory for conversation context
           #              allow_dangerous_code=True, memory=memory, handle_parsing_errors=True)


def update_database():
    try:
        # Establish a connection to the MySQL database
        conn = mysql.connector.connect(
            host="52.221.197.46",
            user="moon_ai",
            password="lc9xHh87tO7FENl@",
            database="moon_ai",
            port=3306
        )

        # Create a cursor object
        cursor = conn.cursor()

        # Step 1: Create a new table with the same structure as 'applicants' but without data
        cursor.execute("DROP TABLE IF EXISTS applicants_copy;")
        cursor.execute("""
            CREATE TABLE applicants_copy LIKE applicants;
        """)

        # Commit the table creation
        conn.commit()

        # Step 2: Read data from Google Sheets and prepare for insertion
        s = Spread("cv-review")
        df = s.sheet_to_df()
        df_list = df.to_dict(orient='records')

        # Convert all data to uppercase except for email and resumelink
        df_upper = [
            {
                key: (str(value).upper() if key not in [
                      'email', 'resumelink'] and value is not None else value)
                for key, value in record.items()
            }
            for record in df_list
        ]

     # Convert datetime strings to MySQL compatible format
        for record in df_upper:
            if 'dateofapplication' in record and record['dateofapplication']:
                # Convert the datetime string to MySQL format
                record['dateofapplication'] = datetime.strptime(
                    record['dateofapplication'], "%Y-%m-%dT%H:%M:%S%z").strftime('%Y-%m-%d %H:%M:%S')

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
            INSERT INTO applicants (applicantname, address, city, contactnumber, email, education, experience, skills, dateofapplication, resumelink, jobposition, visibility, __powerappsid__)
            SELECT applicantname, address, city, contactnumber, email, education, experience, skills, dateofapplication, resumelink, jobposition, visibility, __powerappsid__
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

        print("Database updated successfully")

    except Exception as e:
        print(f"Error: {e}")


# Set up the APScheduler
# scheduler = BackgroundScheduler()
# scheduler.add_job(update_database, 'interval', minutes=3)
# scheduler.start()


@app.route('/records.json')
def get_records():
    try:
        
        # Establish a connection to the MySQL database
        conn = mysql.connector.connect(
            host="52.221.197.46",
            user="moon_ai",
            password="lc9xHh87tO7FENl@",
            database="moon_ai",
            port=3306
        )

        # Create a cursor object
        cursor = conn.cursor(dictionary=True)
        # Execute the query
        query = "SELECT * FROM applicants;"
        cursor.execute(query)

        # Fetch all rows from the executed query
        rows = cursor.fetchall()

        # Close the cursor and connection
        cursor.close()
        conn.close()

        # Return JSON response
        return jsonify(rows)
    except Exception as e:
        print(e)
        return jsonify({'error': 'Failed to fetch records'}), 500


@app.route('/bot-api', methods=['POST'])
def handle_data():
    try:
        data = request.get_json()

        print(data)

        custom_prompt = ("You are an analytical chatbot tasked with thoroughly searching the CSV spreadsheet to find and return every single value "
                         "that matches the user's query. Ensure that you do not miss any matching data.\n\n"
                         "For each match, return all the values from the corresponding row, with each column's name followed by its value, formatted for clarity. "
                         "Present the information in the following structure:\n\n"
                         "Applicant Name:\n"
                         "value1\n\n"
                         "Applicant Skills:\n"
                         "value2\n\n"
                         "Applicant Resume:\n"
                         "value3\n\n"
                         "Continue this format for every column in the row. Repeat this process for every row that matches the user's query. "
                         "If there are multiple matches, include them all, ensuring no relevant data is omitted. "
                         "Provide the information in a clear and organized manner to help the user easily understand the results.")

        user_prompt = custom_prompt + json.dumps(data)

        # Retry logic
        retries = 3
        output = None
        for _ in range(retries):
            try:
                response = agent_executor.invoke(user_prompt)

                # Extract only the output (assuming response is structured as a dict with an 'output' key)
                output = response.get('output', '') if isinstance(
                    response, dict) else response

                if output and "I do not have any information regarding your query" not in output:
                    break  # If we get a valid output, break out of the retry loop

            except Exception as inner_e:
                print(f"Retrying due to parsing error: {inner_e}")

        # If still no valid output, set a fallback message
        if not output:
            output = "I do not have the information for this currently"

    except Exception as e:
        print(f"An error occurred: {e}")
        output = "I do not have the information for this currently"

    output_str = str(output)

    return jsonify({'message': 'Data received successfully!', 'bot_response': output_str})



if __name__ == '__main__':
    app.run(debug=True)
