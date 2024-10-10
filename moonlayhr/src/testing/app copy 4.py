from flask import Flask, jsonify
import os
from flask import Flask, request, jsonify, after_this_request, send_from_directory
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
import re
from docxtpl import DocxTemplate
import mysql.connector
from datetime import datetime
import traceback
import convertapi
import subprocess
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
import requests
import time
import subprocess


from langchain_community.tools.sql_database.tool import (
    InfoSQLDatabaseTool,
    ListSQLDatabaseTool,
    QuerySQLCheckerTool,
    QuerySQLDataBaseTool,
)

from langchain_community.tools.sql_database.tool import QuerySQLDataBaseTool

app = Flask(__name__, static_folder='/static')
CORS(app)

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory(app.static_folder, filename)

# Set up the environment variable for the Google API key


# os.environ["GROQ_API_KEY"] = "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"
os.environ["GOOGLE_API_KEY"] = "AIzaSyBPsmNUDwSp_l4CAC_Ym2efOf6CbGcYZmc"

# Path to your credentials JSON file
SERVICE_ACCOUNT_FILE = 'static/oauth2key/cv-receiver-432606-2c7a15f855d1.json'
SCOPES = ['https://www.googleapis.com/auth/drive.file']

credentials = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES)

drive_service = build('drive', 'v3', credentials=credentials)

# Specify the folder ID where you want to upload the file
# Replace with your specific folder ID
FOLDER_ID = '1jqNuABkPIEZ63r5LFufPxj7ygbJpDsI6'

db = SQLDatabase.from_uri(
    'mysql+mysqlconnector://moon_ai:lc9xHh87tO7FENl%40@52.221.197.46:3306/moon_ai')


#generation_config = {
 #   "temperature": 0.4,
#    "max_output_tokens": 8192,
 #   "response_mime_type": "text/plain",
#}

# Initialize the LLM with the Google Generative AI model
llm = ChatGoogleGenerativeAI(model="gemini-pro", temperature=0.3)

#llm = ChatGroq(
#    model="mixtral-8x7b-32768",
 ##  max_tokens=None,
   # timeout=None,
 #   max_retries=2,
 #   # other params...
#)

toolkit = SQLDatabaseToolkit(db=db, llm=llm)

# Setup the memory to retain context of the last 2 exchanges

memory = ConversationBufferWindowMemory(k=2)

# Model = OllamaLLM(model="llama3")

agent_executor = create_sql_agent(
    llm,
    toolkit,
    verbose=True,
    handle_parsing_errors=True
)

# agent = create_csv_agent(llm, 'static/temp.csv', verbose=True,
                         # Create the agent with CSV capabilities and memory for conversation context
           #              allow_dangerous_code=True, memory=memory, handle_parsing_errors=True)

def get_db_connection():
    return mysql.connector.connect(
        host="52.221.197.46",
        user="moon_ai",
        password="lc9xHh87tO7FENl@",
        database="moon_ai",
        port=3306
    )
    
def categorize_skills(skills):
    # Define categories
    categories = {
        'Programming': [],
        'Technology Knowledge': [],
        'Project Methodology': [],
        'Product Knowledge': [],
        'Operating System': [],
        'Other': []
    }

    # Keywords for each category
    keywords = {
        'Programming': ['Go', 'Gin', '.NET', '.NET Core', 'C#', 'HTML', 'HTML 5', 'CSS', 'JavaScript', 'SQL Server',
                        'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Kafka', 'Unit Test', 'Docker',
                        'React JS', 'Redux', 'Python', 'Java', 'C++', 'Ruby', 'PHP', 'TypeScript', 'Swift', 'Kotlin'],
        'Technology Knowledge': ['OOP', 'SOA', 'DDD', 'Microservices', 'REST', 'GraphQL', 'SOAP', 'API Design'],
        'Project Methodology': ['Waterfall', 'Sprint', 'Scrum', 'Agile', 'Kanban'],
        'Product Knowledge': ['Visual Studio', 'Visual Studio Code', 'Sublime Text', 'SQL Server', 'MySQL', 'PgAdmin',
                              'Apache', 'GitHub', 'SVN', 'AWS', 'Azure', 'Google Cloud', 'Jenkins', 'Docker',
                              'Kubernetes', 'Terraform'],
        'Operating System': ['Windows', 'Linux', 'Mac OS', 'Unix', 'iOS', 'Android'],
    }

    for skill in skills:
        found = False
        for category, keywords_list in keywords.items():
            if any(keyword.lower() in skill.lower() for keyword in keywords_list):
                categories[category].append(skill)
                found = True
                break
        if not found:
            categories['Other'].append(skill)

    return categories

def parse_education(education_str):
    

    entries = re.split(r' \* ', education_str.strip())
    education_details = []

    for entry in entries:
        parts = entry.split(' . ')
        if len(parts) != 2:
            continue  # Skip malformed entries

        degree = parts[0].strip()
        institution_date = parts[1].strip().split(' # ')
        institution = institution_date[0].strip()
        graduation_date = institution_date[1].strip() if len(
            institution_date) > 1 else 'Not Specified'

        graduation_date = re.sub(
            r'[^0-9/]', '', graduation_date) or 'Not Specified'

        education_details.append({
            'Degree': degree,
            'Institution': institution,
            'GraduationDate': graduation_date
        })

    return sorted(education_details, key=lambda x: x['GraduationDate'])

def parse_experience(experience_str):
    entries = re.split(r' \* ', experience_str.strip())

    positions = []
    employers = []
    start_dates = []
    end_dates = []

    for entry in entries:
        parts = entry.split(' # ')
        if len(parts) != 2:
            continue  # Skip malformed entries

        position_employer = parts[0].strip().split(' . ')
        if len(position_employer) != 2:
            continue  # Skip malformed entries

        position = position_employer[0].strip()
        employer = position_employer[1].strip()
        dates = parts[1].strip().split(' - ')
        start_date = dates[0].strip()
        end_date = dates[1].strip() if len(dates) > 1 else 'Present'

        start_date = re.sub(r'[^0-9/]', '', start_date) or 'Not Specified'
        end_date = re.sub(r'[^0-9/]', '', end_date) or 'Present'

        positions.append(position)
        employers.append(employer)
        start_dates.append(start_date)
        end_dates.append(end_date)

    return pd.DataFrame({
        'Position': positions,
        'Employer': employers,
        'startdate': start_dates,
        'enddate': end_dates
    })
    

@app.route('/generatecv', methods=['POST'])
def generate_cv():
    try:
        # Extract the applicant's name and email from the request
        data = request.get_json()
        print(f"Received data: {data}")
        applicant_name = data.get('applicant_name')
        applicant_email = data.get('email')

        # Connect to the database
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        try:
            # Query the database for the applicant's information
            query = """
                SELECT * FROM applicant 
                WHERE applicant_name = %s AND applicant_email = %s
            """
            cursor.execute(query, (applicant_name, applicant_email))
            applicant = cursor.fetchone()
        finally:
            # Ensure that the cursor and connection are always closed
            cursor.close()
            conn.close()

        if not applicant:
            return jsonify({'error': 'Applicant not found'}), 404

        if not applicant.get('applicant_experience'):
            return jsonify({'error': 'Applicant experience data is missing'}), 400

        # Use the applicant_experience value from the database
        applicant_experience = applicant['applicant_experience']
        applicant_city = applicant['applicant_city']
        applicant_dob = applicant['applicant_dateofbirth']
        applicant_gender = applicant['applicant_gender']
        applicant_certification = applicant['applicant_certification']
        applicant_education = applicant['applicant_education']
        applicant_skill = applicant['applicant_skill']
        applicant_knownlanguage = applicant['applicant_knownlanguage']
        applicant_nationality = applicant['applicant_nationality']

        skills = [skill.strip() for skill in applicant_skill.split(',')]
        languages = [language.strip()
                     for language in applicant_knownlanguage.split(',')]
        education_details = parse_education(applicant_education)
        categorized_skills = categorize_skills(skills)
        df = parse_experience(applicant_experience)

        # Define the path to the template
        static_folder = "static"
        template_filename = "CV_template.docx"
        template_path = os.path.join(static_folder, template_filename)

        if not os.path.exists(template_path):
            return jsonify({'error': 'Template file not found'}), 404

        # Load the DOCX template and render
        doc = DocxTemplate(template_path)
        context = {
            'experiences': df.to_dict(orient='records'),
            'applicant_name': applicant_name,
            'applicant_city': applicant_city,
            'applicant_dob': applicant_dob,
            'applicant_gender': applicant_gender,
            'applicant_certification': applicant_certification,
            'applicant_education': education_details,
            'programming_skills': ', '.join(categorized_skills['Programming']),
            'technology_knowledge': ', '.join(categorized_skills['Technology Knowledge']),
            'project_methodology': ', '.join(categorized_skills['Project Methodology']),
            'product_knowledge': ', '.join(categorized_skills['Product Knowledge']),
            'operating_system': ', '.join(categorized_skills['Operating System']),
            'other_skills': ', '.join(categorized_skills['Other']),
            'known_languages': languages,
            'applicant_nationality': applicant_nationality,
        }

        doc.render(context)
        output_path = os.path.join(static_folder, f"word/{applicant_name}_CV.docx")
        doc.save(output_path)
        
        # Convert DOCX to PDF using ConvertAPI
        pdf_path = os.path.join(static_folder, f"pdf/{applicant_name}_CV.pdf")
        libreoffice_path = r"C:\Program Files\LibreOffice\program\soffice.exe"
        pdf_output_path = os.path.join(
            static_folder, f"pdf/{applicant_name}_CV.pdf")
        
        os.makedirs(os.path.dirname(pdf_output_path), exist_ok=True)
    
        
        try:
            subprocess.run([
                'soffice',  # LibreOffice command
                '--headless',  # Headless mode, no GUI
                '--convert-to', 'pdf',  # Convert to PDF
                '--outdir', os.path.dirname(pdf_output_path),
                os.path.abspath(output_path)  # Input DOCX file
            ], check=True)
        except subprocess.CalledProcessError as e:
            return jsonify({'error': 'Conversion to PDF failed', 'details': str(e)}), 500

        # Ensure the PDF file was created successfully
        if not os.path.exists(pdf_path):
            return jsonify({'error': 'PDF file not created'}), 500
      
        # Return the PDF file path in response
        return jsonify({
            'docxUrl': f'{applicant_name}_CV.docx',
            'pdfUrl': f'{applicant_name}_CV.pdf'
        }), 200

    except Exception as e:
        error_message = str(e)
        traceback_str = traceback.format_exc()
        print(f"Error: {error_message}")
        print(f"Traceback: {traceback_str}")
        return jsonify({'error': error_message}), 500
    
app.route('/download/word/<filename>', methods=['GET'])
def download_docx(filename):
    return send_from_directory(os.path.join('static', 'word'), filename)

# Route to serve the PDF file

@app.route('/download/pdf/<filename>', methods=['GET'])
def download_pdf(filename):
    return send_from_directory(os.path.join('static', 'pdf'), filename, as_attachment=True)



@app.route('/upload-audio-drive', methods=['POST'])
def upload_audio_drive():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    audio_file = request.files['file']

    # Save the file locally
    local_file_path = os.path.join("static", "recording", audio_file.filename)

    # Debug: Print the local file path
    print(f"Saving file to: {local_file_path}")

    audio_file.save(local_file_path)

    # Check if the file was saved
    if not os.path.exists(local_file_path):
        return jsonify({'error': 'Failed to save file locally'}), 500

    # Upload to Google Drive
    try:
        file_metadata = {
            'name': audio_file.filename,
            'parents': [FOLDER_ID],
            'mimeType': 'audio/wav'
        }

        media = MediaFileUpload(local_file_path, mimetype='audio/wav')
        uploaded_file = drive_service.files().create(
            body=file_metadata, media_body=media, fields='id'
        ).execute()

        drive_file_id = uploaded_file.get('id')
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    @after_this_request
    def delete_local_file(response):
        try:
            if os.path.exists(local_file_path):
                os.remove(local_file_path)
                print(f"Deleted local file: {local_file_path}")
        except Exception as e:
            print(f"Error deleting file: {str(e)}")
        return response


    return jsonify({
        'message': 'File uploaded successfully',
        'file_path': local_file_path,
        'drive_file_id': drive_file_id
    }), 200

@app.route('/upload-audio', methods=['POST'])
def upload_audio():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    audio_file = request.files['file']
    
    

    # Save the file locally
    local_file_path = os.path.join("static", "recording", "recording.wav")
        
    audio_file.save(local_file_path)

    return jsonify({
        'message': 'File uploaded successfully',
    }), 200


@app.route('/generate-transcript', methods=['POST'])
def generate_transcript():
    local_file_path = os.path.join("static", "recording", "recording.wav")

    if not os.path.exists(local_file_path):
        return jsonify({'error': 'File not found'}), 404

    wit_api_url = 'https://api.wit.ai/speech'
    headers = {
        'Authorization': 'Bearer FYLBSEJGZZJSAC7WQPDTPJGTFMI6M4AR',
        'Content-Type': 'audio/wav'
    }

    try:
        with open(local_file_path, 'rb') as audio:
            response = requests.post(wit_api_url, headers=headers, data=audio)

        if response.status_code == 200:
            response_text = response.text.strip()
            # Debug: Print the raw response
            print("Raw response from Wit.ai:", response_text)

            # Split the response into separate JSON objects
            parts = re.split(r'(?<=\})(?=\{)', response_text)

            final_transcription = []

            for part in parts:
                # Extract text values and their types
                text_matches = re.findall(r'"text"\s*:\s*"([^"]+)"', part)
                type_matches = re.findall(r'"type"\s*:\s*"([^"]+)"', part)

                # Collect only text values for FINAL_TRANSCRIPTION types
                for i in range(len(text_matches)):
                    type_value = type_matches[i] if i < len(
                        type_matches) else ''

                    if type_value == 'FINAL_TRANSCRIPTION':
                        final_transcription.append(text_matches[i])

                print(final_transcription)
                
            # Return all FINAL_TRANSCRIPTION results as a comma-separated string
            if final_transcription:
                return jsonify({'transcription': ', '.join(final_transcription)}), 200
            else:
                return jsonify({'error': 'No final transcription result found'}), 200
        else:
            return jsonify({'error': response.text}), response.status_code

    except Exception as e:
        print(f"Error during transcription: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
    
@app.route('/embed/pdf/<filename>', methods=['GET'])
def embed_pdf(filename):
    return send_from_directory(os.path.join('static', 'pdf'), filename)

@app.route('/delete-record', methods=['POST'])
def delete_record():
    try:
        data = request.get_json()
        # Updated to expect 'emails' array from the frontend
        emails = data.get('emails')

        if not emails or not isinstance(emails, list):
            return jsonify({"error": "Invalid or missing emails"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Prepare query to update all emails
        query = "UPDATE applicant SET visibility = 0 WHERE applicant_email = %s"
        # Loop through the emails   
        cursor.executemany(query, [(email,) for email in emails])
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"message": "Records visibility updated successfully."}), 200

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({'error': 'Failed to update record visibility'}), 500

@app.route('/records.json')
def get_records():
    try:
        # Establish a connection to the MySQL database
        conn = get_db_connection()

        # Create a cursor object
        cursor = conn.cursor(dictionary=True)
        # Execute the query
        query = "SELECT * FROM applicant WHERE visibility = 1;"
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
                         "Provide the information in a clear and organized manner to help the user easily understand the results."
                         "Please use sql_db_query and sql_db_query_checker"
                         "don't use escape characters")

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
    app.run(host="0.0.0.0", port=5000, debug=True)
