import React, { Suspense, useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "datatables.net-bs4/css/dataTables.bootstrap4.min.css";
import "datatables.net-buttons-bs4/css/buttons.bootstrap4.min.css";
import $ from "jquery";
import "datatables.net";
import "datatables.net-bs4";
import "datatables.net-buttons";
import "datatables.net-buttons-bs4";
import axios from "axios";
import { Modal, Button } from "react-bootstrap"; // Import Bootstrap Modal
import "./datatable.css";
import Loadcircle from "../loading/circleload"; // Assuming Loadcircle is a loading spinner component

export default function Initable() {
  const [data, setData] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null); // For PDF preview
  const [docxUrl, setDocxUrl] = useState(null); // For DOC download
  const [showModal, setShowModal] = useState(false); // State to control the modal
  const [embedPdfUrl, setembedPdfUrl] = useState(null); // To control data loading
  const [loading, setLoading] = useState(false); // To control data loading
  const [dataLoading, setDataLoading] = useState(true); // To indicate when data is loading

  useEffect(() => {
    // Set loading to true when fetching data
    setDataLoading(true);
    axios
      .get("http://localhost:5000/records.json") // Adjust URL if necessary
      .then((response) => {
        setData(response.data);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      })
      .finally(() => {
        // Set loading to false after data is fetched
        setDataLoading(false);
      });
  }, []);

  useEffect(() => {
    if (data.length) {
      // Check if DataTable is already initialized and destroy it before reinitializing
      if ($.fn.DataTable.isDataTable("#myTable")) {
        $("#myTable").DataTable().clear().destroy();
      }

      $("#myTable thead #filter-options th").each(function (i) {
        const title = $(this).text();
        $(this).html(
          `<input type="text" placeholder="Search ${title}" class="column_search" />`
        );

        // Enable search for each input
        $("input", this).on("keyup change", function () {
          if (table.column(i).search() !== this.value) {
            table.column(i).search(this.value).draw();
          }
        });
      });
      // Initialize DataTable with row selection capability and a custom button
      const table = $("#myTable").DataTable({
        data: data,
        columns: [
          {
            data: null,
            defaultContent:
              '<input type="checkbox" class="select-checkbox custom-checkbox">',
            orderable: false,
          },
          { data: "applicant_dateofapplication" },
          { data: "applicant_jobposition" },
          { data: "applicant_name" },
          { data: "applicant_contact" },
          { data: "applicant_email" },
          { data: "applicant_education" },
          { data: "applicant_experience" },
          { data: "applicant_skill" },
          { data: "applicant_city" },
          {
            data: "applicant_resumelink",
            render: function (data) {
              return `<button class="view-cv-btn" onclick="window.open('${data}', '_blank')"><i class="far fa-eye"></i></button>`;
            },
          },
          {
            data: null,
            render: function (row) {
              // Generate CV button
              return `<button class="generate-cv-btn" data-name="${row.applicant_name}" data-email="${row.applicant_email}"><i class="fas fa-download"></i></button>`;
            },
          },
        ],
        scrollY: "390px",
        fixedColumns: true,
        orderCellsTop: true,
        layout: {
          topStart: {
            buttons: [
              {
                text: '<i class="fas fa-filter"></i> <span className="delete-txt">Filter</span>',
                className: "delete-btn",
                action: function (e, dt, node, config) {
                  const filterRow = document.getElementById("filter-options");
                  if (filterRow.classList.contains("hide")) {
                    filterRow.classList.remove("hide");
                  } else {
                    filterRow.classList.add("hide");
                  }
                },
              },
              {
                text: '<i class="fas fa-trash"></i> <span className="delete-txt">Delete</span>',
                className: "delete-btn",
                action: function (e, dt, node, config) {
                  handleDelete();
                },
              },
            ],
          },
        },
        initComplete: function () {
          $("#myTable").show();
        },
      });

      $("#myTable thead #filter-options th").on(
        "keyup",
        ".column_search",
        function () {
          table.column($(this).parent().index()).search(this.value).draw();
        }
      );

      // Handle row selection
      $("#myTable").on("click", ".select-checkbox", function () {
        $(this)
          .closest("tr")
          .toggleClass("selected selected-custom", this.checked);
      });

      // Handle Generate CV button click
      $("#myTable tbody").on("click", ".generate-cv-btn", function () {
        const applicantName = $(this).data("name");
        const applicantEmail = $(this).data("email");
        handleGenerateCV(applicantName, applicantEmail);
      });
    }
  }, [data]);

  const handleGenerateCV = (applicantName, applicantEmail) => {
    setLoading(true);
    axios
      .post("http://localhost:5000/generatecv", {
        applicant_name: applicantName,
        email: applicantEmail,
      })
      .then((response) => {
        if (response.data.pdfUrl) {
          const pdfPath = `http://localhost:5000/download/pdf/${response.data.pdfUrl}`;
          const docxPath = `http://localhost:5000/download/word/${response.data.docxUrl}`;
          const embedPdfPath = `http://localhost:5000/embed/pdf/${response.data.pdfUrl}`;
          setPdfUrl(pdfPath);
          setDocxUrl(docxPath);
          setembedPdfUrl(embedPdfPath);
          setShowModal(true);
        } else {
          alert("Failed to generate CV.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleClose = () => setShowModal(false); // Close the modal

  const handleDelete = () => {
    const table = $("#myTable").DataTable();
    const selectedRows = table.rows(".selected").data().toArray();

    if (selectedRows.length > 0) {
      const confirmDelete = window.confirm(
        `Are you sure you want to delete ${selectedRows.length} records? This action cannot be undone.`
      );

      if (confirmDelete) {
        const emailsToDelete = selectedRows.map((row) => row.applicant_email);
        axios
          .post("http://localhost:5000/delete-record", {
            emails: emailsToDelete,
            visibility: false,
          })
          .then(() => {
            alert("Records deleted successfully!");
            table.rows(".selected").remove().draw(false); // Remove the selected rows from the table
          })
          .catch((error) => {
            console.error("Error deleting records:", error);
          });
      } else {
        alert("Deletion canceled.");
      }
    } else {
      alert("Please select rows to delete.");
    }
  };

  return (
    <div>
      {dataLoading ? (
        <Loadcircle /> // Show loading spinner while data is being fetched
      ) : (
        <>
          <Suspense fallback={<Loadcircle />}>
            <table id="myTable" className="table table-striped table-bordered">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Date Of Application</th>
                  <th>Preferred Job Position</th>
                  <th>Applicant</th>
                  <th>Contact Number</th>
                  <th>Email</th>
                  <th>Education</th>
                  <th>Experience</th>
                  <th>Skills</th>
                  <th>City</th>
                  <th>Origin CV</th>
                  <th>Generate CV</th>
                </tr>
                <tr id="filter-options" className="hide">
                  <th className="filter-field hide-field">Select</th>
                  <th className="filter-field">Date Of Application</th>
                  <th className="filter-field">Preferred Job Position</th>
                  <th className="filter-field">Applicant</th>
                  <th className="filter-field">Contact Number</th>
                  <th className="filter-field">Email</th>
                  <th className="filter-field">Education</th>
                  <th className="filter-field">Experience</th>
                  <th className="filter-field">Skills</th>
                  <th className="filter-field">City</th>
                  <th className="filter-field hide-field">Origin CV</th>
                  <th className="filter-field hide-field">Generate CV</th>
                </tr>
              </thead>
              <tbody>{/* DataTable will populate this */}</tbody>
            </table>

            {/* Modal for CV preview */}
            <Modal show={showModal} onHide={handleClose} size="lg">
              <Modal.Body>
                <embed
                  src={`${embedPdfUrl}#toolbar=0&navpanes=0`}
                  width="100%"
                  height="500px"
                  type="application/pdf"
                />
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                  Close
                </Button>
                <a href={docxUrl} download="GeneratedCV.docx">
                  <Button variant="success">Download Word</Button>
                </a>
                <a href={pdfUrl} download="GeneratedCV.pdf">
                  <Button variant="success">Download PDF</Button>
                </a>
              </Modal.Footer>
            </Modal>
          </Suspense>
        </>
      )}
    </div>
  );
}
