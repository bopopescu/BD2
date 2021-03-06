import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { RowDialogData } from 'src/models/row-dialog-data';
import { FormGroup, FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { ForeignKey } from 'src/models/foreign-key';
import { of } from 'rxjs';

@Component({
  selector: 'app-row-add-edit-view',
  templateUrl: './row-add-edit-view.component.html',
  styleUrls: ['./row-add-edit-view.component.css']
})
export class RowAddEditViewComponent implements OnInit {

  private enableMocking = false;

  public rowDialogData: RowDialogData;
  public formGroup: FormGroup;

  public parkingStatusEnum = ['STARTED', 'ENDED', 'PAID', 'CANCELLED'];
  public paymentStatusEnum = ['SUCCESS', 'FAILURE'];

  public foreignKeys: { [key: string]: ForeignKey[] } = {};

  constructor(
    public dialogRef: MatDialogRef<RowAddEditViewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RowDialogData, private httpClient: HttpClient, private toastr: ToastrService) {
    
    this.rowDialogData = data;
    
    if (data.isAddMode) {
      this.rowDialogData.data = [];
      for (const column of data.columns) {
        this.rowDialogData.data.push(null);
      }
    }

    const requiredForeignKeys = this.getRequiredForeignKeys();
    if (requiredForeignKeys.length > 0) {
      this.getForeignKeys(requiredForeignKeys);
    }

    this.createFormGroup();
  }

  ngOnInit(): void {
    // this.enableMocking = document.location.port === '4200';
  }

  private createFormGroup() {
    const controls = {};

    for (let i = 0; i < this.rowDialogData.columns.length; i++){
      const column = this.rowDialogData.columns[i];
      let value = this.rowDialogData.data[i];

      if (column.type === 'date' && value !== null) {
        value = this.getDateStringForInput(value);
      }

      const formControl = new FormControl(value);
      controls[column.name] = formControl;
    }

    this.formGroup = new FormGroup(controls);
  }

  private getDateStringForInput(value): string {
    const date = new Date(value);
    date.setUTCHours(date.getHours());
    return date.toISOString().slice(0, 16);;
  }

  confirm() {
    if (this.rowDialogData.isAddMode) {
      this.addNewRow();
    } else {
      this.saveRow();
    }
  }

  private getProcessedFormData() {
    const formData = this.formGroup.getRawValue();

    for (const column of this.rowDialogData.columns) {
      // convert date to timestamp
      if (column.type === 'date' && formData[column.name] !== null) {
        console.log(formData[column.name]);
        formData[column.name] = new Date(formData[column.name]).getTime();
      }
    }

    return formData;
  }

  private addNewRow() {
    this.httpClient.post(`api/table/${this.rowDialogData.tableName}`, this.getProcessedFormData()).subscribe(() => {
      this.dialogRef.close(true);
    }, (error) => {
      this.toastr.show(error.message);
    });
  }

  private saveRow() {
    this.httpClient.put(`api/table/${this.rowDialogData.tableName}`, this.getProcessedFormData()).subscribe(() => {
      this.dialogRef.close(true);
    }, (error) => {
      this.toastr.show(error.message);
    });
  }

  private getRequiredForeignKeys() {
    const requiredForeignKeys = [];

    for (const column of this.rowDialogData.columns) {
      if (column.foreignKeyTableName) {
        requiredForeignKeys.push(column.foreignKeyTableName);
      }
    }

    return requiredForeignKeys;
  }

  private getForeignKeys(requiredForeignKeys: string[]) {
    // initialize an empty array for each required foreign key
    for (const foreignKey of requiredForeignKeys) {
      this.foreignKeys[foreignKey] = [];
    }

    this.httpClient.post('api/foreign-keys', requiredForeignKeys).subscribe((foreignKeysMap: { [key: string]: ForeignKey[] }) => {
      this.foreignKeys = foreignKeysMap;
    }, (error) => {
      this.toastr.show(error.message);
    });
  }

}
