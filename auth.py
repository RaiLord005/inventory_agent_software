from flask import Blueprint, request, jsonify, session, render_template, redirect
from sqlalchemy import create_engine, text
import random
import os
from dotenv import load_dotenv

# Load the variables from the .env file
load_dotenv()
auth_bp = Blueprint('auth', __name__)

# Fetch DB credentials from .env
db_host = os.getenv('DB_HOST')
db_user = os.getenv('DB_USER')
db_password = os.getenv('DB_PASSWORD')
db_name = os.getenv('DB_NAME')

# Create SQLAlchemy Engine (The bridge to your AWS RDS)
connection_string = f"mysql+pymysql://{db_user}:{db_password}@{db_host}/{db_name}"
engine = create_engine(connection_string)

def generate_user_id():
    return random.randint(1000, 9999)

@auth_bp.route('/login')
def login_page():
    return render_template('login.html')

@auth_bp.route('/signup')
def signup_page():
    return render_template('signup.html')

@auth_bp.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    username = data['username']
    password = data['password']

    # engine.begin() handles the connection and auto-commits the transaction
    with engine.begin() as conn:
        # --- CHECK IF USERNAME EXISTS ---
        check_user_sql = text("SELECT username FROM users WHERE username = :username")
        existing_user = conn.execute(check_user_sql, {"username": username}).fetchone()
        
        if existing_user:
            return jsonify({"message": "Username already exists"}), 409

        # Generate unique 4-digit ID
        user_id = generate_user_id()
        check_id_sql = text("SELECT user_id FROM users WHERE user_id = :user_id")
        
        while conn.execute(check_id_sql, {"user_id": user_id}).fetchone():
            user_id = generate_user_id()

        # Insert new user securely using named parameters
        insert_sql = text("INSERT INTO users (user_id, username, password) VALUES (:user_id, :username, :password)")
        conn.execute(insert_sql, {
            "user_id": user_id, 
            "username": username, 
            "password": password
        })

    return jsonify({"message": "User created", "user_id": user_id})

@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data['username']
    password = data['password']

    # Using engine.connect() for read-only operations
    with engine.connect() as conn:
        login_sql = text("SELECT user_id FROM users WHERE username = :username AND password = :password")
        result = conn.execute(login_sql, {
            "username": username, 
            "password": password
        }).fetchone()

    if result:
        # result[0] gets the first column (user_id) from the returned row
        session['user_id'] = result[0]
        return jsonify({"success": True})
    else:
        return jsonify({"success": False}), 401

@auth_bp.route('/logout')
def logout():
    session.clear()
    return redirect('/login')
