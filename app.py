from flask import Flask, render_template, request, url_for, redirect, flash, session 
from flask_sqlalchemy import SQLAlchemy
from werkzeug import generate_password_hash, check_password_hash
from twilio.rest import Client

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///tutors.sqlite3'
app.config["SECRET_KEY"] = "qscvbnm"


doctorsDB = SQLAlchemy(app)
patientsDB = SQLAlchemy(app)

#Twilio messaging api set-up

account_sid = ''
auth_token = ''
client = Client(account_sid, auth_token)



class doctors(doctorsDB.Model):
   __tablename__ = "doctors"
   uid = doctorsDB.Column(doctorsDB.Integer, primary_key = True)
   username = doctorsDB.Column(doctorsDB.String(50), nullable=False)
   email = doctorsDB.Column(doctorsDB.String(50), nullable=False)
   password = doctorsDB.Column(doctorsDB.String(50))
   hospitalName = doctorsDB.Column(doctorsDB.String(50))
   patients = doctorsDB.Column(doctorsDB.String(600))
   # patients = doctorsDB.Column(ARRAY(30))

   def __init__(self, username, email, password, hospitalName):
      self.username = username
      self.email = email
      self.password = password
      self.hospitalName = hospitalName
      self.patients = ""



class patients(patientsDB.Model):
   __tablename__ = "patients"
   uid = patientsDB.Column(patientsDB.Integer, primary_key = True)
   # patient's first and last name
   name = patientsDB.Column(patientsDB.String(50))
   email = doctorsDB.Column(doctorsDB.String(50))
   phone_number = doctorsDB.Column(doctorsDB.String(20))
   drname = doctorsDB.Column(doctorsDB.String(50))

   def __init__(self, name, email, drname, phone_number):
      self.name = name
      self.email = email
      self.drname = drname
      self.phone_number = phone_number


@app.route("/")
def loadSelfDiagnosisPatientPage():
	return "<h2>Welcome! Platform Is Under Development: We are iterating!</h2>"

@app.route("/sign-up-doctor", methods = ['GET', 'POST'])
def doctorSignUp():
   if request.method == 'POST':
      user = doctors.query.filter_by(email = request.form["email"]).first()
      print("EXISTING USER ?", user)
      print("EMAIL", request.form["email"])
      if user is not None:
         

         return render_template("returning-user.html", user = {"email": user.email})

      doctor = doctors(request.form['username'], request.form['email'], request.form['password'], request.form['hospital'])
      session['email'] = request.form['email']
      session['username'] = request.form['username']
      session['hospital'] = request.form['hospital']
      # session['patients'] = [{'name' : 'Ben'}, {'email': 'ben@yahoo.fr'}]
      print(">>>>>>> CURRENT LOGGED IN USERNAME", request.form['username'])
      all_patients_for_this_doctor = patients.query.filter_by(drname = request.form['username'])
      session['patients'] = [{'name': p.name, 'email': p.email, 'phone_number': p.phone_number} for p in all_patients_for_this_doctor]


      if len(session['patients']) > 0:
         print("PATIENTS", session['patients'])

      doctorsDB.session.add(doctor)
      doctorsDB.session.commit()
      return redirect(url_for("doctorPage"))
   return render_template("sign-up.html")   



@app.route("/sign-in-doctor", methods = ['GET', 'POST'])
def doctorSignIn():

   if request.method == 'POST':
      username = request.form["username"]
      password = request.form["password"]


      entryFromUserName = doctors.query.filter_by(username = username).first()
      if entryFromUserName is None:
         return render_template("sign-in.html")
      if entryFromUserName.password == password:
         # return render_template("doctors-portal.html", user = user) 
         session["username"] = username
         session["password"] = entryFromUserName.password
         session["email"] = entryFromUserName.email
         session['hospital'] = entryFromUserName.hospitalName
         all_patients_for_this_doctor = patients.query.filter_by(drname = username)
         session['patients'] = [{'name': p.name, 'email': p.email, 'phone_number': p.phone_number} for p in all_patients_for_this_doctor]
         return redirect(url_for("doctorPage"))
   return render_template("sign-in.html")   


@app.route("/doctor-portal")
def doctorPage():
   if 'username' not in session:
      redirect(url_for('doctorSignIn'))
   return render_template("doctors-portal.html", user = session)


@app.route("/sign-out")
def signOut():
   if 'username' in session:
      session.pop("username")
   else:
      print(session["username"])
   return redirect(url_for("doctorSignIn"))


@app.route("/patient-portal")
def patientPage():
   return render_template("index.html")


@app.route("/add-new-patient", methods = ['GET', 'POST'])
def newPatient():
   if request.method == 'POST':
      name = request.form['name']
      email = request.form['email']
      drname = session['username']
      phone_number = request.form['phone_number']
      patient = patients(name, email, drname, phone_number)

      # update doctors table with new patient's name

      currentDoctor = doctors.query.filter_by(username = session["username"]).first()

      # new patient is added to current session's doctor's table
      currentDoctor.patients += "| " + name
      
      patientsDB.session.add(patient)
      patientsDB.session.commit()
      # all_patients = patients.query.all()
      all_patients_for_this_doctor = patients.query.filter_by(drname = drname)
      collection = [{'name': p.name, 'email': p.email, 'phone_number': p.phone_number} for p in all_patients_for_this_doctor]

         
      session['patients'] = collection
      print("Patient table created, data inserted!", patient.email, len(session['patients']))
      return redirect(url_for('doctorPage'))

   return render_template("new-patient.html")


@app.route("/patient/<phone>", methods=['GET'])
def patientInfo(phone):
   print(phone)
   content = "Please go ahead and take the diagnosis: "
   message = client.messages \
                .create(
                     body=content,
                     from_='',
                     to=phone
                 )
   return render_template("patient.html")





doctorsDB.create_all()
patientsDB.create_all()


if __name__ == '__main__':
   app.run(debug = True)

