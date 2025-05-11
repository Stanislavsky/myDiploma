django.jQuery(function($) {
    function toggleDoctorFields() {
        var isDoctor = $('#id_is_doctor').is(':checked');
        $('.doctor-fields').toggle(isDoctor);
    }

    // Initial state
    toggleDoctorFields();

    // Toggle on checkbox change
    $('#id_is_doctor').change(toggleDoctorFields);
}); 