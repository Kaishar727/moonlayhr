import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "datatables.net-bs4/css/dataTables.bootstrap4.min.css";
import $ from "jquery";
import "datatables.net";
import "datatables.net-bs4";
import axios from "axios";

export default function Applicantdata() {
const [data, setData] = useState([]);

  useEffect(() => {
    // Fetch JSON data from Flask server using axios
    axios
      .get("http://localhost:5000/records.json") // Adjust URL if necessary
      .then((response) => {
        setData(response.data);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }, []);

  useEffect(() => {
    if (data.length) {
      // Log the data to inspect its structure
      console.log("Data received:", data);

      // Check if DataTable is already initialized and destroy it before reinitializing
      if ($.fn.DataTable.isDataTable("#myTable")) {
        $("#myTable").DataTable().clear().destroy();
      }

      // Initialize DataTable after data has been loaded
      $("#myTable").DataTable({
        data: data,
        columns: [
          // Ensure these match your data keys
          { data: "applicantid" },
          { data: "applicantname" },
          { data: "address" },
          { data: "city" },     
          { data: "contactnumber" },
          { data: "email" },
          { data: "education" },
          { data: "experience" },
          { data: "skills" },
          { data: "dateofapplication" },
          { data: "resumelink" },
        ],
      });
    }
  }, [data]); // Reinitialize DataTable when data changes

  return (
    <div className="info-container">
      <table id="myTable" className="table table-striped table-bordered">
        <thead>
          <tr>
            <th>Applicant ID</th>
            <th>Applicant</th>
            <th>Address</th>
            <th>City</th>
            <th>Contact Number</th>
            <th>Email</th>
            <th>Education</th>
            <th>Experience</th>
            <th>Skills</th>
            <th>Date of Application</th>
            <th>Resume</th>
          </tr>
        </thead>
        <tbody>{/* DataTable will populate this */}</tbody>
      </table>
    </div>
  );
}
