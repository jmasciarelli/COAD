// Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

//  updateProgress method: when changes are made to students schedule, use updateProgress
//  to update the credit counter and progress bar

var duplicate = false;
var ignore = false;


// Remove button: ______________________________________________________________________________

function remove(el) {
    var child = el;
    var parent = child.parentNode;
    parent.parentNode.removeChild(parent);
    checkDuplicates();
    colorCourseList();
    checkRequiredCourses();
    updateProgress();
    checkPrereq();
    switchToWarning();
    buildJSON();
}


// Drag and drop: ______________________________________________________________________________

drag_and_drop();
colorCourseList();
checkDuplicates();


function callback(data, totWeight) {
    creditValueData = data;
    totalCreditValue = totWeight;
}


// addDragTag: adds any newely added elements that has class 'draggable' into the query
function addDragTag() {
    const draggables = document.querySelectorAll('.draggable')

    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', () => {
            draggable.classList.add('dragging')
        })
        draggable.addEventListener('dragend', () => {
            draggable.classList.remove('dragging')
        })
    })
}


function calcTotalCredits(el) {
    var totValue = 0.0;
    for (i = 0; i < el.childElementCount; i++) {
        totValue += parseFloat($(el.children[i].children[0]).attr("creditv"));
    }
    return totValue;
}


/**
 * drag_and_drop: 
 *  This function controls the drag and drop functionality of the course planner. It reads the dragged element along with the exact position that
 *  it is hovering over. The dragged item will either get inserted above or below another item depending on its distance away from the item's centre.
 *  When dropping a course list item into the course planner, it will get converted into a course planner element before insertion. If duplicates exist
 *  within the planner, then they duplicated item along with the original item will get highlighted until all duplicates are removed. Each year container
 *  has a max capacity of credits that it can hold. When a container is nearly full, it will highlight the elements at the end of its list to indicate that
 *  it has nearly reached its max capacity. Each time an item is dragged/dropped, a series of functions gets called on update.
 */
function drag_and_drop() {
    const containers = document.querySelectorAll('.year')
    addDragTag();

    containers.forEach(container => {

        container.addEventListener('dragover', e => {
            e.preventDefault()
            const afterElement = getDragAfterElement(container.children[1].children[0], e.clientY)
            const draggable = document.querySelector('.dragging')
            var totalCreditValue = calcTotalCredits(container.children[1].children[0]);

            //if user can add credit to container..
            if (afterElement == null && !draggable.classList.contains('course_list') && totalCreditValue < config.max_cr_year) {
                container.children[1].children[0].appendChild(draggable)
            } else if (!draggable.classList.contains('course_list') && totalCreditValue < config.max_cr_year) {
                container.children[1].children[0].insertBefore(draggable, afterElement)
            }
            checkDuplicates();

        })
        container.addEventListener('drop', e => {
            e.preventDefault();
            const afterElement = getDragAfterElement(container.children[1].children[0], e.clientY)
            const draggable = document.querySelector('.dragging')
            var totalCreditValue = calcTotalCredits(container.children[1].children[0]);

            const og_year = draggable.parentNode.parentNode.parentNode.children[0].textContent.trim().substr(5) //the draggable's original year number
            const this_year = container.children[0].textContent.trim().substr(5) //the dragover's year number
            
            if (afterElement == null && totalCreditValue < config.max_cr_year || afterElement == null && og_year == this_year) {
                if (draggable.classList.contains('course_list')) {
                    const droppable = convertToCSObj(draggable);
                    container.children[1].children[0].appendChild(droppable);
                } else {
                    container.children[1].children[0].appendChild(draggable);
                }
            } else if (totalCreditValue < config.max_cr_year || og_year == this_year) {  //insert element
                if (draggable.classList.contains('course_list')) {
                    const droppable = convertToCSObj(draggable);
                    container.children[1].children[0].insertBefore(droppable, afterElement);
                } else {
                    container.children[1].children[0].insertBefore(draggable, afterElement);
                }
            }
            checkDuplicates();
            addDragTag();
            colorCourseList();
            updateProgress();
            switchToWarning();
            if (!ignore) {
                warnDuplicates(duplicate);
                if (!duplicate) {
                    duplicate = false;
                }
            }
            checkRequiredCourses();
            checkPrereq();
            buildJSON();
        })
    })
}


// getDragAfterElement: determines where the item should get dropped
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.draggable:not(.dragging)')]

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect()
        const offset = y - box.top - box.height / 2

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child }
        } else {
            return closest
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element
}


//looks for duplicate credits witihin the student's CP
function checkDuplicates() {
    duplicate = false;
    const yearContainers = document.querySelectorAll('.credit_box')
    var idArray = [];
    //find duplicates
    yearContainers.forEach(year => {
        idArray.push(year.children[0].id)
    })
    let findDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) != index)
    var uniqueIds = new Set(findDuplicates(idArray))
    //highlight duplicates
    yearContainers.forEach(year => {
        if (uniqueIds.has(year.children[0].id)) {
            year.style.backgroundColor = "#FFE0C4";
            duplicate = true;
        }
        else { year.style.backgroundColor = "white"; }
    })
}

//removeYear: removes the last year container in the CP
function removeYear(el) {
    var child = el;
    var parent = child.parentNode;
    var grandparent = parent.parentNode;
    grandparent.parentNode.removeChild(grandparent);
    colorCourseList();
    updateYearNums();
}


function updateYearNums() {
    var i = 1;
    const yearContainers = document.querySelectorAll('.year_container')
    yearContainers.forEach(year => {
        year.children[0].children[0].textContent = "Year " + i;
        i++;
    })
}

// addYear: adds a year container to the student's CP
function addYear() {
    var timeOutFunc;
    document.getElementById('addYearText').classList.add('show');
    clearTimeout(timeOutFunc);
    timeOutFunc = setTimeout(function () { document.getElementById('addYearText').classList.remove('show') }, 2000);

    var yearNum = document.getElementById('course_planner').childElementCount;
    if (yearNum < 10) {
        yearNum++;

        // create the empty html elements
        const newYearDiv = document.createElement("div");
        const newTitleDiv = document.createElement("div");
        const newTitleSpan = document.createElement("span");
        const newXSpan = document.createElement("span");
        const newDiv = document.createElement("div");
        const newUl = document.createElement("ul");

        // add the appropriate styles/classes to each element
        newUl.classList.add('ul_container', 'ul_format');

        newTitleSpan.classList.add('mb-2', 'mt-3');
        newTitleSpan.style.userSelect = "none";
        newTitleSpan.appendChild(document.createTextNode("Year " + yearNum));

        newXSpan.classList.add('mt-3', 'ml-5', 'remove_year');
        newXSpan.style.cursor = "pointer";
        newXSpan.setAttribute("onclick", "removeYear(this)");
        newXSpan.appendChild(document.createTextNode("remove"));

        newTitleDiv.classList.add('row', 'year');
        newTitleDiv.style.userSelect = "none";

        // add the styles/classes and event listners to the newYearDiv
        newYearDiv.classList.add('col-3', 'year_container','year', 'align-top', 'mt-2', 'mb-2', 'ml-1', 'pb-1', 'mr-1');

        newYearDiv.addEventListener('dragover', e => {
            e.preventDefault()
            const afterElement = getDragAfterElement(newUl, e.clientY)
            const draggable = document.querySelector('.dragging')
            var totalCreditValue = calcTotalCredits(newUl);

            //if user can add credit to container..
            if (afterElement == null && !draggable.classList.contains('course_list') && totalCreditValue < config.max_cr_year) {
                newUl.appendChild(draggable)
            } else if (!draggable.classList.contains('course_list') && totalCreditValue < config.max_cr_year) {
                newUl.insertBefore(draggable, afterElement)
            }
            checkDuplicates();
        })
        newYearDiv.addEventListener('drop', e => {
            e.preventDefault();
            const afterElement = getDragAfterElement(newUl, e.clientY)
            const draggable = document.querySelector('.dragging')
            var totalCreditValue = calcTotalCredits(newUl);

            const og_year = draggable.parentNode.parentNode.parentNode.children[0].textContent.trim().substr(5) //the draggable's original year number
            const this_year = newTitleDiv.textContent.trim().substr(5) //the dragover's year number

            if (afterElement == null && totalCreditValue < config.max_cr_year || afterElement == null && og_year == this_year) {
                if (draggable.classList.contains('course_list')) {
                    const droppable = convertToCSObj(draggable);
                    newUl.appendChild(droppable);
                } else {
                    newUl.appendChild(draggable);
                }
            } else if (totalCreditValue < config.max_cr_year || og_year == this_year) {  //insert element
                if (draggable.classList.contains('course_list')) {
                    const droppable = convertToCSObj(draggable);
                    newUl.insertBefore(droppable, afterElement);
                } else {
                    newUl.insertBefore(draggable, afterElement);
                }
            }
            checkDuplicates();
            addDragTag();
            colorCourseList();
            updateProgress();
            switchToWarning();
            if (!ignore) {
                warnDuplicates(duplicate);
                if (!duplicate) {
                    duplicate = false;
                }
            }
        })

        // append each child element to its parent
        newDiv.appendChild(newUl);
        newTitleDiv.appendChild(newTitleSpan);
        newTitleDiv.appendChild(newXSpan);
        newYearDiv.appendChild(newTitleDiv);
        newYearDiv.appendChild(newDiv);

        // add the new element to the course planner container
        document.getElementById("course_planner").appendChild(newYearDiv);
    }
}


// Course List filter: ________________________________________________________________________


function filterFunction() {
    var input, filter, ul, li, a, i, txtValue;
    input = document.getElementById("myInput");
    filter = input.value.toUpperCase();
    ul = document.getElementById("myUL");
    li = ul.getElementsByTagName("li");
    for (i = 0; i < li.length; i++) {
        a = li[i].getElementsByTagName("div")[0];
        txtValue = a.textContent || a.innerText;
        cContext = $(a).attr("creditc");
        
        if ((txtValue.toUpperCase().indexOf(filter) > -1) || (cContext.toUpperCase().indexOf(filter) > -1)) {
            li[i].style.display = "";
        } else {
            li[i].style.display = "none";
        }        
    }
    if ($(li).is(":visible")) {
        console.log($(li).is(":visible"))
        $("#noCourses").css("display", "none");
    }
    else {
        console.log($(li).is(":visible"))
        $("#noCourses").css("display", "block");
    }
}

// convertToCSObj: converts the CS list item to a CP item
function convertToCSObj(draggable) {
    // create the empty containers
    const newLi = document.createElement("li");
    const newTitle = document.createElement("div");
    const newBtn = document.createElement("span");
    const id = draggable.children[0].id;
    const creditv = $(draggable.children[0]).attr("creditv");

    // attach the styles for the newBtn
    newBtn.classList.add('col-1', 'pl-2', 'remove_btn');
    const x = document.createTextNode("x");
    newBtn.appendChild(x);
    newBtn.setAttribute("onclick", "remove(this)");

    // attach the styles and content to the newTitle 
    newTitle.id = id;
    $(newTitle).attr("creditv", creditv);
    newTitle.classList.add('col-10', 'pl-2', 'courseName');

    const course_name = draggable.innerText;

    const title = document.createTextNode(course_name);
    newTitle.appendChild(title);

    // attach the styles for the newLi
    newLi.classList.add('row', 'credit_box', 'draggable', 'p-2');
    newLi.style.whiteSpace = "normal";
    newLi.draggable = true;

    // add the components to newLi
    newLi.appendChild(newTitle);
    newLi.appendChild(newBtn);

    return newLi;
}

// colorCourseList: colours the CL item depending if already present in CP
function colorCourseList() {
    var courseList = document.querySelectorAll('.course_list');
    var courseSchd = document.querySelectorAll('.col-10');
    for (i = 0; i < courseList.length; i++) {
        if (courseList.item(i).classList.contains('list-group-item-secondary')) {
            courseList.item(i).classList.remove('list-group-item-secondary');
        }
        for (j = 0; j < courseSchd.length; j++) {
            if (courseList.item(i).innerText.substring(0, 9) == courseSchd.item(j).innerText.substring(0.9)) {
                courseList.item(i).classList.add('list-group-item-secondary');
                break;
            }
        }
    }
}


function displayCourseInfo(cid) {
    var nameID = 'courseInfo_name ' + cid;
    var descriptID = 'courseInfo_description ' + cid;
    var creditVID = 'courseInfo_creditValue ' + cid;
    var creditCON = 'courseInfo_creditContext ' + cid;
    var nameText = document.getElementById(nameID).textContent;
    var descriptText = document.getElementById(descriptID).textContent;
    var creditVText = 'Credit Value: ' + document.getElementById(creditVID).textContent;
    var creditCText = 'Context: ' + document.getElementById(creditCON).textContent;
    document.getElementById('courseInfo_name').textContent = nameText;
    document.getElementById('courseInfo_description').textContent = descriptText;
    document.getElementById('courseInfo_creditValue').textContent = creditVText;
    document.getElementById('courseInfo_creditContext').textContent = creditCText;


    document.getElementById('courseInfo').style.visibility = 'visible';
    document.getElementById('courseInfo').style.position = 'static';
}

/*function hideCourseInfo(cid) {
    //document.getElementById('course_info').style.visibility = 'hidden';
}*/