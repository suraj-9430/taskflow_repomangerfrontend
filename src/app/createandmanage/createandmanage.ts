import { Component, OnInit, ViewChild, TemplateRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserService } from './user';
import { Observable } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-createandmanage',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './createandmanage.html',
  styleUrl: './createandmanage.css',
})
export class Createandmanage implements OnInit {


  today: string;
  employeeId: string = '';
  firstName: string = '';
  middleName: string = '';
  lastName: string = '';
  contact: number | null = null;
  email: string = '';
  role: string = '';
  dateOfJoining: string = '';
  employmentType: string = '';
  empStatus: string = '';
  department: string = '';
  designation: string = '';
  password: string = '';
  confirmPassword: string = '';
  country: string = '';

  countries: string[] = [
    'United States',
    'Canada',
    'Mexico',
    'United Kingdom',
    'Australia',
    'India',
    'Germany',
    'France',
    'Japan',
    'China',
    'Brazil',
    'South Africa',
    // Add more countries as needed
  ];

  action!: 'create' | 'managerole' | 'deactive' | 'edit';

  private modalService = inject(NgbModal);
  @ViewChild('content') content!: TemplateRef<any>;
  popupMessage: string = '';

  // Edit mode properties
  isEditMode: boolean = false;
  editUserId: any | null = null;

  // Manage Roles properties
  searchTerm: string = '';
  users: any[]=[] ;
  filteredUsers: any[] = [];

  // Deactivate Users properties
  deactivateSearchTerm: string = '';
  statusFilter: string = 'all';
  filteredDeactivateUsers: any[] = [];
  userId!:number;


  // Sample users data for editing (in real app, this would come from a service


  constructor(private activeroute: ActivatedRoute, private userservice: UserService, private router: Router) {
    this.today = new Date().toISOString().split('T')[0];
  }
  ngOnInit(): void {
    this.activeroute.queryParams.subscribe(params => {
      this.action = params['option'];
      
      // Handle edit mode
      if (this.action === 'edit') {
        this.isEditMode = true;
        this.editUserId = params['userId'];
        if (this.editUserId) {
          this.loadUserData(this.editUserId);
        }
      } else {
        this.isEditMode = false;
        this.editUserId = null;
      }
      
      // Always load users when navigating to these tabs
      this.loadUsers();
    });
  }


    page = 1;
  totalPages = 0;


  loadUsers() {
    this.userservice.fetchUsers(this.page).subscribe((res: any) => {
      // Initialize newRole to empty string so the 'Select Role' placeholder shows properly
      const usersWithRoles = res.users.map((u: any) => ({ ...u, newRole: '' }));
      this.users = usersWithRoles; // Store the original fetched data
      this.filteredUsers = usersWithRoles;
      this.filteredDeactivateUsers = usersWithRoles;
      this.totalPages = res.totalPages;
    });
  }

  next() {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadUsers();
    }
  }

  prev() {
    if (this.page > 1) {
      this.page--;
      this.loadUsers();
    }
  }

  // Load user data for editing
  loadUserData(userId: number): void {

    this.userservice.getuserbyid(userId).subscribe((res:any)=>{
  
      
   
    const user = res['data'];

    if (user) {
      this.employeeId = user.userId;
      this.firstName = user.firstName;
      this.middleName = user.middleName;
      this.lastName = user.lastName;
      this.email = user.email;
      this.contact = user.contactNumber;
      this.role = user.role;
      this.dateOfJoining = user.dateOfJoining.split('T')[0];
      this.employmentType = user.employmentType;
      this.empStatus = user.empStatus;
      this.department = user.department;
      this.designation = user.designation;
      this.country = user.country;
    }
     })
  }

  filterUsers(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredUsers = this.users.filter(user =>
      user.firstName?.toLowerCase().includes(term) ||
      user.lastName?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.userId?.toString().toLowerCase().includes(term) ||
      user.role?.toLowerCase().includes(term)
    );
  }

  updateRole(user: any): void {
    if (!user.newRole) return;

    this.userservice.updateRole(user.userId, user.newRole).subscribe({
      next: (res: any) => {
        if (res.success) {
          user.role = user.newRole;
          user.newRole = ''; // Reset selection after update
          alert('Role updated successfully');
        }
      },
      error: (err) => {
        console.error('Error updating role:', err);
        alert('Failed to update role');
      }
    });
  }

  // Deactivate Users methods
  filterDeactivateUsers(): void {
    const term = this.deactivateSearchTerm.toLowerCase();
    let filtered = this.users.filter(user =>
      user.firstName?.toLowerCase().includes(term) ||
      user.lastName?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.userId?.toString().toLowerCase().includes(term)
    );

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(user => user.empStatus?.toLowerCase() === this.statusFilter);
    }

    this.filteredDeactivateUsers = filtered;
  }

  setStatusFilter(empStatus: string): void {
    this.statusFilter = empStatus;
    this.filterDeactivateUsers();
  }

  deactivateUser(user: any): void {
    this.userservice.updateStatus(user.userId, 'inactive').subscribe({
      next: (res: any) => {
        if (res.success) {
          user.empStatus = 'inactive';
          alert(`User ${user.firstName} ${user.lastName} has been deactivated`);
          this.filterDeactivateUsers();
        }
      },
      error: (err) => {
        console.error('Error deactivating user:', err);
        alert('Failed to deactivate user');
      }
    });
  }

  activateUser(user: any): void {
    this.userservice.updateStatus(user.userId, 'active').subscribe({
      next: (res: any) => {
        if (res.success) {
          user.empStatus = 'active';
          alert(`User ${user.firstName} ${user.lastName} has been activated`);
          this.filterDeactivateUsers();
        }
      },
      error: (err) => {
        console.error('Error activating user:', err);
        alert('Failed to activate user');
      }
    });
  }

  holdUser(user: any): void {
    this.userservice.updateStatus(user.userId, 'hold').subscribe({
      next: (res: any) => {
        if (res.success) {
          user.empStatus = 'hold';
          alert(`User ${user.firstName} ${user.lastName} has been put on hold`);
          this.filterDeactivateUsers();
        }
      },
      error: (err) => {
        console.error('Error putting user on hold:', err);
        alert('Failed to put user on hold');
      }
    });
  }

  onSubmit() {
    if (this.isEditMode) {
      console.log('User updated!', {
        id: this.editUserId,
        employeeId: this.employeeId,
        firstName: this.firstName,
        middleName: this.middleName,
        lastName: this.lastName,
        contact: this.contact,
        email: this.email,
        role: this.role,
        dateOfJoining: this.dateOfJoining,
        employmentType: this.employmentType,
        empStatus: this.empStatus,
        department: this.department,
        designation: this.designation,
        country: this.country,
      });
      // Here you would typically send this update to a backend service
      alert('User updated successfully!');
    } else {
      const createduser = {
        firstName: this.firstName,
        middleName: this.middleName,
        lastName: this.lastName,
        contact: this.contact,
        email: this.email,
        role: this.role,
        dateOfJoining: this.dateOfJoining,
        employmentType: this.employmentType,
        empStatus: this.empStatus,
        department: this.department,
        designation: this.designation,
        password: this.password,
        confirmPassword: this.confirmPassword,
        country: this.country,
      }
      this.userservice.createuser(createduser).subscribe({
        next: (res: any) => {
          console.log(res);
          if (res['success'] == true && res['message'] == 'User created successfully') {
            this.popupMessage = `User created successfully! ${res['userId']}`;
            this.modalService.open(this.content, { ariaLabelledBy: 'modal-basic-title' }).result.then(
              () => { this.router.navigate(['/dashboard']); },
              () => { this.router.navigate(['/dashboard']); }
            );

          }

        },
        error: (err) => {
          console.log(err);
        }
      })
      // Here you would typically send this data to a backend service

    }
  }
}
