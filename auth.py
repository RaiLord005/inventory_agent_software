from flask import Blueprint, request, jsonify, session, render_template, redirect
import mysql.connector
import random
from dotenv import load_dotenv
import os
# Load the variables from the .env file
load_dotenv()
auth_bp = Blueprint('auth', __name__)

DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME')
}


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

    conn = mysql.connector.connect(**DB_CONFIG) #
    cursor = conn.cursor()

    # --- CHECK IF USERNAME EXISTS ---
    cursor.execute("SELECT username FROM users WHERE username=%s", (username,))
    if cursor.fetchone():
        conn.close()
        return jsonify({"message": "Username already exists"}), 409

    # Generate unique 4-digit ID
    user_id = generate_user_id()
    cursor.execute("SELECT user_id FROM users WHERE user_id=%s", (user_id,)) #
    while cursor.fetchone():
        user_id = generate_user_id() #

    cursor.execute(
        "INSERT INTO users (user_id, username, password) VALUES (%s,%s,%s)",
        (user_id, username, password)
    ) #

    conn.commit() #
    conn.close()

    return jsonify({"message": "User created", "user_id": user_id}) #


@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data['username']
    password = data['password']

    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()

    cursor.execute(
        "SELECT user_id FROM users WHERE username=%s AND password=%s",
        (username, password)
    )

    result = cursor.fetchone()
    conn.close()

    if result:
        session['user_id'] = result[0]
        return jsonify({"success": True})
    else:
        return jsonify({"success": False}), 401


@auth_bp.route('/logout')
def logout():
    session.clear()
    return redirect('/login')
